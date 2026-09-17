import { questions, states } from './questions.js';
import {
  formatBrazilianPhone, normalizeEmail, normalizeName, validateEmail,
  validateName, validatePhone, validateState,
} from './validation.js';
import { classifyLead } from './qualification.js';
import { createWhatsAppLink } from './whatsapp.js';

const app = document.querySelector('#app');
const initialAnswers = () => ({
  name: '', phone: '', email: '', state: '', situation: '', concern: '', urgency: '', hiring: '',
  dataConsent: false, contactConsent: false,
});

let answers = initialAnswers();
let currentStep = -1;
let navigationLocked = false;
let autoAdvanceTimer;

function element(tag, attributes = {}, text = '') {
  const node = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') node.className = value;
    else if (key === 'disabled') node.disabled = value;
    else node.setAttribute(key, value);
  });
  if (text) node.textContent = text;
  return node;
}

function clearApp() {
  clearTimeout(autoAdvanceTimer);
  app.replaceChildren();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function focusPrimary() {
  requestAnimationFrame(() => {
    const target = app.querySelector('[data-autofocus], h1');
    target?.focus({ preventScroll: true });
  });
}

function createButton(label, className = 'button button--primary') {
  return element('button', { type: 'button', className }, label);
}

function renderIntro() {
  currentStep = -1;
  clearApp();
  const card = element('section', { className: 'card card--intro', 'aria-labelledby': 'intro-title' });
  const eyebrow = element('p', { className: 'eyebrow' }, 'Análise inicial');
  const title = element('h1', { id: 'intro-title', tabindex: '-1' }, 'Entenda o próximo passo para a sua situação');
  const copy = element('p', { className: 'lead' }, 'Responda algumas perguntas rápidas para identificarmos como podemos ajudar.');
  const time = element('p', { className: 'time-note' }, 'Leva aproximadamente 1 minuto.');
  const button = createButton('Começar');
  button.addEventListener('click', () => renderStep(0));
  card.append(eyebrow, title, copy, time, button);
  app.append(card);
  focusPrimary();
}

function createProgress() {
  const wrapper = element('div', { className: 'progress' });
  const label = element('p', { className: 'progress__label', 'aria-live': 'polite' }, `Etapa ${currentStep + 1} de ${questions.length}`);
  const track = element('div', { className: 'progress__track', role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': String(questions.length), 'aria-valuenow': String(currentStep + 1), 'aria-label': 'Progresso do formulário' });
  const fill = element('span', { className: 'progress__fill' });
  fill.style.width = `${((currentStep + 1) / questions.length) * 100}%`;
  track.append(fill);
  wrapper.append(label, track);
  return wrapper;
}

function createError(id) {
  return element('p', { id, className: 'field-error', role: 'alert', hidden: '' });
}

function showError(control, errorNode, message) {
  errorNode.textContent = message;
  errorNode.hidden = false;
  control.setAttribute('aria-invalid', 'true');
  control.focus();
}

function createTextQuestion(question, form) {
  const group = element('div', { className: 'field-group' });
  const label = element('label', { for: question.id }, question.label);
  const input = element('input', {
    id: question.id, name: question.id, type: question.type, autocomplete: question.autocomplete,
    inputmode: question.inputMode, maxlength: String(question.maxLength), required: '',
    'aria-describedby': `${question.id}-error`, 'data-autofocus': '',
  });
  input.value = question.id === 'phone' ? formatBrazilianPhone(answers.phone) : answers[question.id];
  const error = createError(`${question.id}-error`);
  if (question.id === 'phone') {
    input.addEventListener('input', () => { input.value = formatBrazilianPhone(input.value); });
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (navigationLocked) return;
    const result = question.id === 'name' ? validateName(input.value)
      : question.id === 'phone' ? validatePhone(input.value) : validateEmail(input.value);
    if (!result.valid) return showError(input, error, result.error);
    input.removeAttribute('aria-invalid');
    error.hidden = true;
    answers[question.id] = result.value;
    goNext();
  });
  group.append(label, input, error);
  form.append(group, element('button', { type: 'submit', className: 'button button--primary' }, 'Continuar'));
}

function createStateQuestion(form) {
  const group = element('div', { className: 'field-group' });
  const label = element('label', { for: 'state' }, 'Estado');
  const select = element('select', { id: 'state', name: 'state', required: '', 'aria-describedby': 'state-error', 'data-autofocus': '' });
  select.append(element('option', { value: '' }, 'Selecione um estado'));
  states.forEach(([code, name]) => select.append(element('option', { value: code }, name)));
  select.value = answers.state;
  const error = createError('state-error');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = validateState(select.value, states.map(([code]) => code));
    if (!result.valid) return showError(select, error, result.error);
    answers.state = result.value;
    goNext();
  });
  group.append(label, select, error);
  form.append(group, element('button', { type: 'submit', className: 'button button--primary' }, 'Continuar'));
}

function createChoiceQuestion(question, form) {
  const fieldset = element('fieldset', { className: 'choice-list', 'aria-describedby': `${question.id}-hint` });
  const legend = element('legend', { className: 'sr-only' }, question.title);
  const hint = element('p', { id: `${question.id}-hint`, className: 'selection-hint' }, 'Selecione uma opção para continuar.');
  fieldset.append(legend, hint);
  question.options.forEach(([value, labelText], index) => {
    const label = element('label', { className: 'choice' });
    const input = element('input', { type: 'radio', name: question.id, value, ...(index === 0 ? { 'data-autofocus': '' } : {}) });
    input.checked = answers[question.id] === value;
    const marker = element('span', { className: 'choice__marker', 'aria-hidden': 'true' });
    const text = element('span', { className: 'choice__text' }, labelText);
    input.addEventListener('change', () => {
      if (navigationLocked) return;
      answers[question.id] = value;
      navigationLocked = true;
      form.querySelectorAll('input').forEach((item) => { item.disabled = true; });
      autoAdvanceTimer = setTimeout(() => {
        navigationLocked = false;
        renderStep(currentStep + 1);
      }, 320);
    });
    label.append(input, marker, text);
    fieldset.append(label);
  });
  form.append(fieldset);
}

function createConsentQuestion(form) {
  const fieldset = element('fieldset', { className: 'choice-list consent-list' });
  fieldset.append(element('legend', { className: 'sr-only' }, 'Confirmações obrigatórias'));
  const items = [
    ['dataConsent', 'Concordo com o tratamento dos meus dados para análise da solicitação.'],
    ['contactConsent', 'Autorizo o contato por WhatsApp, telefone e e-mail.'],
  ];
  items.forEach(([id, text], index) => {
    const label = element('label', { className: 'choice choice--checkbox' });
    const input = element('input', { type: 'checkbox', id, name: id, ...(index === 0 ? { 'data-autofocus': '' } : {}) });
    input.checked = answers[id];
    input.addEventListener('change', () => { answers[id] = input.checked; });
    label.append(input, element('span', { className: 'choice__marker', 'aria-hidden': 'true' }), element('span', { className: 'choice__text' }, text));
    fieldset.append(label);
  });
  const error = createError('consent-error');
  fieldset.setAttribute('aria-describedby', 'consent-error');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const controls = [...form.querySelectorAll('input[type="checkbox"]')];
    answers.dataConsent = controls[0].checked;
    answers.contactConsent = controls[1].checked;
    if (!answers.dataConsent || !answers.contactConsent) {
      error.textContent = 'Aceite as duas confirmações para concluir.';
      error.hidden = false;
      controls.find((control) => !control.checked)?.focus();
      return;
    }
    renderResult(classifyLead(answers));
  });
  form.append(fieldset, error, element('button', { type: 'submit', className: 'button button--primary' }, 'Concluir'));
}

function goNext() {
  if (navigationLocked) return;
  navigationLocked = true;
  renderStep(currentStep + 1);
  navigationLocked = false;
}

function renderStep(index) {
  currentStep = index;
  clearApp();
  const question = questions[currentStep];
  const shell = element('section', { className: 'form-shell', 'aria-labelledby': 'question-title' });
  const card = element('div', { className: 'card card--question' });
  const title = element('h1', { id: 'question-title', tabindex: '-1' }, question.title);
  const form = element('form', { novalidate: '' });
  if (question.type === 'text' || question.type === 'tel' || question.type === 'email') createTextQuestion(question, form);
  else if (question.type === 'select') createStateQuestion(form);
  else if (question.type === 'choice') createChoiceQuestion(question, form);
  else createConsentQuestion(form);
  const nav = element('div', { className: 'step-nav' });
  if (currentStep > 0) {
    const back = createButton('Voltar', 'back-button');
    back.setAttribute('aria-label', `Voltar para a etapa ${currentStep}`);
    back.addEventListener('click', () => {
      if (navigationLocked) return;
      navigationLocked = false;
      renderStep(currentStep - 1);
    });
    nav.append(back);
  }
  card.append(title, form, nav);
  shell.append(createProgress(), card);
  app.append(shell);
  focusPrimary();
}

function renderResult(result) {
  currentStep = questions.length;
  clearApp();
  const qualified = result.classification === 'qualified';
  const card = element('section', { className: 'card card--result', 'aria-labelledby': 'result-title' });
  card.append(element('p', { className: 'eyebrow' }, 'Análise inicial concluída'));
  const title = element('h1', { id: 'result-title', tabindex: '-1' }, qualified ? 'O próximo passo é falar com a equipe' : 'Formulário concluído');
  const copy = element('p', { className: 'lead' }, qualified
    ? 'Pelas respostas fornecidas, você pode iniciar o contato com a equipe da Dra. Priscilla.'
    : 'Neste momento, este canal de atendimento particular pode não ser o mais adequado para a sua necessidade.');
  card.append(title, copy);
  if (qualified) {
    const link = element('a', { className: 'button button--primary', href: createWhatsAppLink(), target: '_blank', rel: 'noopener noreferrer' }, 'Falar pelo WhatsApp');
    const disclaimer = element('p', { className: 'disclaimer' }, 'O preenchimento do formulário não representa contratação ou início de atendimento jurídico.');
    card.append(link, disclaimer);
  } else {
    card.append(element('p', { className: 'result-complement' }, 'Se a sua situação mudar, você poderá preencher o formulário novamente.'));
    const restart = createButton('Recomeçar formulário', 'button button--secondary');
    restart.addEventListener('click', () => {
      answers = initialAnswers();
      renderIntro();
    });
    card.append(restart);
  }
  app.append(card);
  focusPrimary();
}

renderIntro();

// A URL da Política de Privacidade deverá ser configurada aqui quando o documento
// definitivo existir. Nesta fase, nenhum link vazio ou política fictícia é exibido.
export const PRIVACY_POLICY_URL = null;

