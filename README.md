# Formulário de qualificação — Dra. Priscilla Cerqueira Moura

Aplicação web mobile-first para uma análise inicial rápida de potenciais clientes. O fluxo apresenta uma pergunta por tela, valida os dados no navegador, classifica o perfil localmente e libera o contato por WhatsApp apenas para leads qualificados.

## Stack

- HTML5 e CSS3
- JavaScript puro com ES Modules
- Node.js 22 ou superior
- Express 5
- `node:test`
- npm

## Estrutura

```text
.
├── public/
│   ├── index.html             # documento e metadados
│   ├── styles.css             # sistema visual responsivo
│   └── js/
│       ├── app.js             # estado, renderização e navegação
│       ├── questions.js       # perguntas, opções e estados brasileiros
│       ├── validation.js      # normalização e validações puras
│       ├── qualification.js   # classificação e prioridade
│       ├── whatsapp.js        # configuração e criação do link
│       └── leadGateway.js     # contrato da futura persistência (desativado)
├── test/                      # testes dos módulos puros
├── server.js                  # servidor e health check
├── package.json
└── README.md
```

## Instalação e execução

Requisito: Node.js 22+ e npm.

```bash
npm install
npm start
```

A aplicação fica disponível em `http://localhost:3000`. Para desenvolvimento com reinício automático:

```bash
npm run dev
```

É possível alterar a porta pela variável de ambiente `PORT`.

## Testes

```bash
npm test
```

Os testes cobrem normalização e validação de nome, telefone e e-mail, todos os critérios de classificação e prioridade, e a geração/codificação do link do WhatsApp.

## Health check

`GET /health` responde com status HTTP 200:

```json
{"status":"ok"}
```

O Express publica somente o conteúdo de `public/`; arquivos da raiz, testes e configuração não são expostos. O servidor não recebe nem registra dados pessoais.

## Classificação

Um lead é qualificado quando informa uma das cinco situações atendidas (inclusive ajuda para familiar), está preparado para contratar ou deseja entender valores, e aceita as duas confirmações finais.

O lead é desqualificado quando seleciona situação diferente, está apenas pesquisando ou busca exclusivamente atendimento gratuito. A prioridade é:

- `urgent`: prazo em 48 horas, prazo em 7 dias ou acusação de descumprimento;
- `high`: medida em vigor sem conhecimento dos prazos;
- `normal`: sem prazo/medida oficial ou quando não sabe informar.

A função pura `classifyLead` centraliza essas regras. Quando houver integração com Google Sheets, a mesma classificação deverá obrigatoriamente ser repetida e validada no servidor. A classificação do navegador não poderá ser a única fonte de verdade em produção.

## WhatsApp

- Número: `5527998737944`
- Mensagem: `Olá, Dra. Priscilla. Acabei de preencher o formulário de análise inicial e gostaria de conversar sobre minha situação.`

O link usa `https://wa.me/`, número somente com dígitos e mensagem codificada com `encodeURIComponent`. Não há redirecionamento automático.

## Limitações desta primeira fase

- Os dados permanecem apenas na memória da página e não são persistidos.
- Atualizar a página reinicia o formulário.
- A classificação ocorre somente no navegador.
- `leadGateway.js` declara explicitamente que a persistência externa não está configurada.
- Não há Google Sheets, banco de dados, classificação no servidor, proteção antispam, Meta Pixel, Meta Conversions API, UTMs ou salvamento parcial externo.
- A URL da Política de Privacidade ainda não está configurada; o ponto futuro está documentado em `app.js` e nenhum link fictício é mostrado.
- Logo e favicons são provisoriamente substituídos por texto.
- Não há Docker, GitHub, EasyPanel ou deploy.
- A aplicação ainda não está pronta para anúncios ou produção.

## Próximas integrações

Em uma fase futura: endpoint seguro no servidor, validação e classificação server-side, persistência no Google Sheets, proteção antispam e limitação de requisições, política de privacidade definitiva, rastreamento consentido para Meta Ads e processo de deploy.

