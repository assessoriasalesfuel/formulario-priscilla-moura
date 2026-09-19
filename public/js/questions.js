export const questions = [
  {
    id: 'name', type: 'text', title: 'Como podemos chamar você?', label: 'Nome completo',
    autocomplete: 'name', inputMode: 'text', maxLength: 100,
  },
  {
    id: 'phone', type: 'tel', title: 'Qual é o seu melhor WhatsApp?', label: 'WhatsApp com DDD',
    autocomplete: 'tel', inputMode: 'numeric', maxLength: 15,
  },
  {
    id: 'email', type: 'email', title: 'Qual é o seu melhor e-mail?', label: 'E-mail',
    autocomplete: 'email', inputMode: 'email', maxLength: 254,
  },
  {
    id: 'situation', type: 'choice', title: 'Qual opção mais se aproxima da sua situação?',
    options: [
      ['protective_measure_received', 'Já recebi uma medida protetiva.'],
      ['measure_requested', 'Disseram que solicitaram uma medida contra mim.'],
      ['report_or_complaint', 'Foi registrado um boletim de ocorrência ou denúncia.'],
      ['fear_of_measure', 'Tenho receio de que uma medida seja solicitada.'],
      ['helping_family', 'Estou buscando ajuda para um familiar.'],
      ['other_situation', 'Minha situação é diferente dessas.'],
    ],
  },
  {
    id: 'concern', type: 'choice', title: 'O que mais preocupa você neste momento?',
    options: [
      ['children_contact', 'Não conseguir ver meus filhos.'],
      ['leave_home', 'Ter que sair de casa.'],
      ['breach_accusation', 'Ser acusado de descumprir a medida.'],
      ['work_or_company', 'Ter problemas no trabalho ou na empresa.'],
      ['reputation_or_assets', 'Prejudicar minha reputação ou meu patrimônio.'],
      ['next_steps', 'Não saber o que fazer a partir de agora.'],
    ],
  },
  {
    id: 'urgency', type: 'choice', title: 'Existe algo que precisa ser resolvido rapidamente?',
    options: [
      ['deadline_48h', 'Tenho audiência ou prazo nas próximas 48 horas.'],
      ['deadline_7d', 'Tenho audiência ou prazo nos próximos 7 dias.'],
      ['breach_accusation', 'Existe uma acusação de descumprimento.'],
      ['active_unknown_deadline', 'A medida já está valendo, mas não sei os prazos.'],
      ['no_official_deadline', 'Ainda não existe prazo ou medida oficial.'],
      ['unknown', 'Não sei informar.'],
    ],
  },
  {
    id: 'hiring', type: 'choice', title: 'Sobre contratar um advogado particular, qual opção representa melhor seu momento?',
    options: [
      ['ready_to_hire', 'Estou preparado para contratar se o atendimento fizer sentido.'],
      ['needs_pricing', 'Quero entender os valores e as condições antes de decidir.'],
      ['researching', 'Ainda estou apenas pesquisando.'],
      ['free_only', 'Procuro exclusivamente atendimento gratuito.'],
    ],
  },
  { id: 'consent', type: 'consent', title: 'Podemos analisar suas respostas e entrar em contato?' },
];
