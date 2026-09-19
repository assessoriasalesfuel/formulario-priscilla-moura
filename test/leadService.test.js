import test from 'node:test';
import assert from 'node:assert/strict';
import { createLeadService, protectSheetText } from '../server/leadService.js';
import { WHATSAPP_MESSAGE, WHATSAPP_NUMBER } from '../public/js/whatsapp.js';

const FIXED_DATE = new Date('2026-09-18T12:00:00.000Z');
const LEAD_ID = '10000000-0000-4000-8000-000000000001';

const personal = {
  name: '  Ana   Lúcia ',
  phone: '(27) 99873-7944',
  email: ' ANA@EXEMPLO.COM ',
};

const qualifiedAnswers = {
  ...personal,
  situation: 'protective_measure_received',
  concern: 'children_contact',
  urgency: 'deadline_48h',
  hiring: 'ready_to_hire',
  dataConsent: true,
  contactConsent: true,
};

function createRepository() {
  const rows = [];
  return {
    rows,
    appendCalls: 0,
    updateCalls: 0,
    failAppend: false,
    failUpdate: false,
    async append(row) {
      if (this.failAppend) throw new Error('sheets failure');
      this.appendCalls += 1;
      rows.push([...row]);
    },
    async findByLeadId(leadId) {
      const index = rows.findIndex((row) => row[0] === leadId);
      return index === -1 ? null : { rowNumber: index + 2, row: [...rows[index]] };
    },
    async update(rowNumber, row) {
      if (this.failUpdate) throw new Error('sheets failure');
      this.updateCalls += 1;
      rows[rowNumber - 2] = [...row];
    },
  };
}

function setup(overrides = {}) {
  const repository = createRepository();
  const service = createLeadService({
    repository,
    now: () => FIXED_DATE,
    createId: () => LEAD_ID,
    ...overrides,
  });
  return { repository, service };
}

async function createInitial(service, extra = {}) {
  return service.createLead({ ...personal, lastStep: 'email', ...extra });
}

test('cria lead inicial com dados normalizados e 30 colunas', async () => {
  const { repository, service } = setup();
  const result = await createInitial(service);
  assert.deepEqual(result, { leadId: LEAD_ID, status: 'Em preenchimento' });
  assert.equal(repository.rows.length, 1);
  assert.equal(repository.rows[0].length, 30);
  assert.equal(repository.rows[0][4], 'Ana Lúcia');
  assert.equal(repository.rows[0][5], '27998737944');
  assert.equal(repository.rows[0][6], 'ana@exemplo.com');
  assert.equal(repository.rows[0][7], '27');
});

test('gera Lead ID com randomUUID por padrão', async () => {
  const repository = createRepository();
  const service = createLeadService({ repository, now: () => FIXED_DATE });
  const result = await createInitial(service);
  assert.match(result.leadId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
});

test('rejeita dados pessoais inválidos no servidor', async () => {
  const { service } = setup();
  await assert.rejects(() => createInitial(service, { phone: '123' }), /WhatsApp/u);
  await assert.rejects(() => createInitial(service, { email: 'inválido' }), /e-mail/u);
  await assert.rejects(() => createInitial(service, { name: '12' }), /nome/u);
});

test('atualiza a mesma linha pelo Lead ID', async () => {
  const { repository, service } = setup();
  await createInitial(service);
  await service.updateLead(LEAD_ID, { situation: 'helping_family', lastStep: 'situation' });
  assert.equal(repository.rows.length, 1);
  assert.equal(repository.rows[0][8], 'Estou buscando ajuda para um familiar.');
  assert.equal(repository.rows[0][13], 'situation');
});

test('retorna erro para Lead ID inexistente', async () => {
  const { service } = setup();
  await assert.rejects(
    () => service.updateLead('inexistente', { situation: 'helping_family' }),
    (error) => error.statusCode === 404 && error.code === 'LEAD_NOT_FOUND',
  );
});

test('rejeita payload vazio, campo proibido e opção inválida', async () => {
  const { service } = setup();
  await createInitial(service);
  await assert.rejects(() => service.updateLead(LEAD_ID, {}), /Payload/u);
  await assert.rejects(() => service.updateLead(LEAD_ID, { status: 'Qualificado' }), /Payload/u);
  await assert.rejects(() => service.updateLead(LEAD_ID, { urgency: 'inventada' }), /urgency/u);
});

test('recalcula classificação e prioridade no servidor', async () => {
  const { service } = setup();
  await createInitial(service);
  const result = await service.completeLead(LEAD_ID, qualifiedAnswers);
  assert.equal(result.classification, 'qualified');
  assert.equal(result.priority, 'urgent');
  assert.equal(result.qualified, true);
});

test('ignora classificação, prioridade e motivo enviados pelo cliente', async () => {
  const { repository, service } = setup();
  await createInitial(service);
  await service.completeLead(LEAD_ID, {
    ...qualifiedAnswers,
    classification: 'disqualified',
    priority: 'normal',
    reason: 'forçado',
  });
  assert.equal(repository.rows[0][2], 'Qualificado');
  assert.equal(repository.rows[0][3], 'urgente');
  assert.notEqual(repository.rows[0][12], 'forçado');
});

test('conclui lead qualificado e persiste campos finais', async () => {
  const { repository, service } = setup();
  await createInitial(service);
  await service.completeLead(LEAD_ID, qualifiedAnswers);
  const row = repository.rows[0];
  assert.equal(row[2], 'Qualificado');
  assert.equal(row[15], FIXED_DATE.toISOString());
  assert.equal(row[18], 'Sim');
  assert.equal(row[19], 'Sim');
  assert.equal(row[20], FIXED_DATE.toISOString());
});

test('conclui lead desqualificado conforme regras existentes', async () => {
  const { repository, service } = setup();
  await createInitial(service);
  const result = await service.completeLead(LEAD_ID, { ...qualifiedAnswers, hiring: 'free_only' });
  assert.equal(result.qualified, false);
  assert.equal(repository.rows[0][2], 'Desqualificado');
});

test('falha do Sheets impede confirmação de criação e conclusão', async () => {
  const { repository, service } = setup();
  repository.failAppend = true;
  await assert.rejects(() => createInitial(service), /sheets failure/u);
  repository.failAppend = false;
  await createInitial(service);
  repository.failUpdate = true;
  await assert.rejects(() => service.completeLead(LEAD_ID, qualifiedAnswers), /sheets failure/u);
});

test('bloqueia WhatsApp para lead desqualificado', async () => {
  const { service } = setup();
  await createInitial(service);
  await service.completeLead(LEAD_ID, { ...qualifiedAnswers, situation: 'other_situation' });
  await assert.rejects(
    () => service.registerWhatsAppAccess(LEAD_ID),
    (error) => error.statusCode === 403 && error.code === 'WHATSAPP_NOT_ALLOWED',
  );
});

test('libera o link correto somente para lead qualificado concluído', async () => {
  const { service } = setup();
  await createInitial(service);
  await service.completeLead(LEAD_ID, qualifiedAnswers);
  const result = await service.registerWhatsAppAccess(LEAD_ID);
  assert.equal(result.link, `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`);
});

test('registra o primeiro acesso ao WhatsApp', async () => {
  const { repository, service } = setup();
  await createInitial(service);
  await service.completeLead(LEAD_ID, qualifiedAnswers);
  await service.registerWhatsAppAccess(LEAD_ID);
  assert.equal(repository.rows[0][16], 'Sim');
  assert.equal(repository.rows[0][17], FIXED_DATE.toISOString());
});

test('registro repetido do WhatsApp é idempotente', async () => {
  const { repository, service } = setup();
  await createInitial(service);
  await service.completeLead(LEAD_ID, qualifiedAnswers);
  await service.registerWhatsAppAccess(LEAD_ID);
  const updatesAfterFirstAccess = repository.updateCalls;
  await service.registerWhatsAppAccess(LEAD_ID);
  assert.equal(repository.updateCalls, updatesAfterFirstAccess);
  assert.equal(repository.rows.length, 1);
});

test('chave de idempotência evita linha duplicada na criação', async () => {
  const { repository, service } = setup();
  const first = await service.createLead({ ...personal, lastStep: 'email' }, 'sessão-1');
  const second = await service.createLead({ ...personal, lastStep: 'email' }, 'sessão-1');
  assert.deepEqual(second, first);
  assert.equal(repository.appendCalls, 1);
  assert.equal(repository.rows.length, 1);
});

test('conclusão repetida atualiza a mesma linha sem duplicar', async () => {
  const { repository, service } = setup();
  await createInitial(service);
  await service.completeLead(LEAD_ID, qualifiedAnswers);
  await service.completeLead(LEAD_ID, qualifiedAnswers);
  assert.equal(repository.appendCalls, 1);
  assert.equal(repository.rows.length, 1);
});

test('protege textos iniciados por operadores de fórmula', async () => {
  assert.equal(protectSheetText('=SUM(A1:A2)'), "'=SUM(A1:A2)");
  assert.equal(protectSheetText('+comando'), "'+comando");
  assert.equal(protectSheetText('-comando'), "'-comando");
  assert.equal(protectSheetText('@comando'), "'@comando");
  const { repository, service } = setup();
  await createInitial(service, { name: '=Ana' });
  assert.equal(repository.rows[0][4], "'=Ana");
});

test('persiste rótulos legíveis e mantém metadados futuros vazios', async () => {
  const { repository, service } = setup();
  await createInitial(service);
  await service.completeLead(LEAD_ID, qualifiedAnswers);
  const row = repository.rows[0];
  assert.equal(row[8], 'Já recebi uma medida protetiva.');
  assert.equal(row[9], 'Não conseguir ver meus filhos.');
  assert.equal(row[10], 'Tenho audiência ou prazo nas próximas 48 horas.');
  assert.equal(row[11], 'Estou preparado para contratar se o atendimento fizer sentido.');
  assert.deepEqual(row.slice(21, 30), Array(9).fill(''));
});

test('exige os dois consentimentos na conclusão', async () => {
  const { service } = setup();
  await createInitial(service);
  await assert.rejects(
    () => service.completeLead(LEAD_ID, { ...qualifiedAnswers, contactConsent: false }),
    /confirmações/u,
  );
});
