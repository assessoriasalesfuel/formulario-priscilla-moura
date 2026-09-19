# Formulário de qualificação — Dra. Priscilla Cerqueira Moura

Aplicação web mobile-first para uma análise inicial rápida de potenciais clientes. O fluxo apresenta uma pergunta por tela, persiste o acompanhamento na aba `Leads` de uma planilha Google Sheets e libera o contato por WhatsApp somente após confirmação server-side de um lead qualificado.

## Stack

- HTML5 e CSS3
- JavaScript puro com ES Modules
- Node.js 22 ou superior
- Express 5
- Google Sheets API (`googleapis`)
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
│       ├── questions.js       # perguntas e opções do formulário
│       ├── validation.js      # normalização e validações puras
│       ├── qualification.js   # classificação e prioridade
│       ├── whatsapp.js        # configuração e criação do link
│       └── leadGateway.js     # chamadas HTTP ao backend
├── server/
│   ├── googleSheets.js        # autenticação e operações na aba Leads
│   └── leadService.js         # validação, classificação e persistência
├── test/                      # testes unitários e de integração simulada
├── Dockerfile                 # imagem de produção com Node.js 22
├── .dockerignore              # exclusões do contexto de build
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

## Google Sheets e variáveis de ambiente

Configure estas variáveis somente no backend:

```text
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

Use `.env.example` apenas como referência. O projeto não carrega `.env` automaticamente: em produção, configure os valores no painel do serviço. A chave privada pode ser armazenada com quebras de linha representadas por `\n`; o servidor faz a normalização antes de autenticar.

A Service Account precisa ter permissão de **Editor** na planilha existente. Compartilhe a planilha com o e-mail configurado em `GOOGLE_SERVICE_ACCOUNT_EMAIL`. Nunca coloque credenciais reais no GitHub.

Somente a aba `Leads` é escrita. As abas derivadas `Qualificados` e `Desqualificados` não são alteradas diretamente.

## Docker

Para construir e executar a imagem localmente:

```bash
docker build -t formulario-priscilla-moura .
docker run --rm -p 3000:3000 formulario-priscilla-moura
```

A imagem utiliza Node.js 22 Alpine, instala somente dependências de produção, executa como usuário sem privilégios e verifica periodicamente a rota `/health`. Em plataformas como EasyPanel, selecione a opção **Dockerfile** e mantenha a porta da aplicação em `3000`, salvo quando a plataforma fornecer `PORT` automaticamente.

## Testes

```bash
npm test
```

Os testes cobrem validações, classificação, prioridade, persistência simulada, idempotência, proteção contra fórmulas, falhas do Sheets e controle server-side do WhatsApp. Nenhum teste acessa o Google Sheets real.

## Health check

`GET /health` responde com status HTTP 200:

```json
{"status":"ok"}
```

O Express publica somente o conteúdo de `public/`; arquivos da raiz, testes, módulos do backend e configurações não são expostos. O servidor recebe os dados necessários para persistência, mas não registra payloads nem dados pessoais em logs.

## Classificação

Um lead é qualificado quando informa uma das cinco situações atendidas (inclusive ajuda para familiar), está preparado para contratar ou deseja entender valores, e aceita as duas confirmações finais.

O lead é desqualificado quando seleciona situação diferente, está apenas pesquisando ou busca exclusivamente atendimento gratuito. A prioridade é:

- `urgent`: prazo em 48 horas, prazo em 7 dias ou acusação de descumprimento;
- `high`: medida em vigor sem conhecimento dos prazos;
- `normal`: sem prazo/medida oficial ou quando não sabe informar.

A função pura `classifyLead` centraliza essas regras e é executada novamente no servidor durante a conclusão. Classificação, prioridade e motivo enviados pelo navegador são ignorados.

## WhatsApp

- Número: `5527998737944`
- Mensagem: `Olá, Dra. Priscilla. Acabei de preencher o formulário de análise inicial e gostaria de conversar sobre minha situação.`

O link usa `https://wa.me/`, número somente com dígitos e mensagem codificada com `encodeURIComponent`. Ele só é retornado pelo servidor depois de confirmar que o lead está concluído e qualificado. Não há redirecionamento automático.

## Meta Pixel

O Pixel ID `959018970525443` é inicializado uma única vez no carregamento real da página. Os eventos configurados são:

- `PageView`: carregamento real da página;
- `FormStarted`: primeiro clique em “Começar”;
- `FormCompleted`: conclusão confirmada pelo backend e pelo Google Sheets;
- `Lead`: somente para leads qualificados pelo backend;
- `Contact`: acesso ao WhatsApp confirmado pelo backend.

Nenhum dado pessoal, resposta do formulário, informação jurídica ou identificador do CRM é enviado como parâmetro à Meta. Advanced Matching e Meta Conversions API (CAPI) não estão implementados.

## Atribuição

No primeiro carregamento são capturados `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid`, URL de entrada, referrer e uma categoria genérica de dispositivo. Esses dados permanecem em memória até a criação do lead e são gravados nas colunas de atribuição da aba `Leads`. Não há armazenamento em `localStorage` ou `sessionStorage`, nem persistência do User-Agent completo.

## Limitações atuais

- O Lead ID permanece somente na memória da página; atualizar a página reinicia a sessão do formulário.
- A idempotência da criação combina uma chave mantida em memória no navegador e no processo do servidor. Não substitui um armazenamento transacional distribuído em ambientes com múltiplas réplicas.
- Não há proteção antispam, limitação de requisições ou Meta Conversions API.
- A URL da Política de Privacidade ainda não está configurada; o ponto futuro está documentado em `app.js` e nenhum link fictício é mostrado.
- Logo e favicons são provisoriamente substituídos por texto.
- Ainda não há configuração específica de EasyPanel nem deploy concluído.
- A aplicação ainda não está pronta para anúncios ou produção.

## Próximas integrações

Em uma fase futura: proteção antispam e limitação de requisições, política de privacidade definitiva, Meta Conversions API e configuração final do ambiente de deploy.
