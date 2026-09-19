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
│       ├── attribution.js     # UTMs, FBCLID, URL inicial e dispositivo
│       ├── metaPixel.js       # eventos do Meta Pixel sem dados pessoais
│       └── leadGateway.js     # chamadas HTTP ao backend
├── server/
│   ├── googleSheets.js        # autenticação e operações na aba Leads
│   ├── leadSchema.js          # fonte única dos 22 cabeçalhos e índices A:V
│   └── leadService.js         # validação, classificação e persistência
├── scripts/
│   └── migrateSheetColumns.js # migração explícita do CRM para 22 colunas
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
CONFIRM_SHEET_MIGRATION=false
```

Use `.env.example` apenas como referência. O projeto não carrega `.env` automaticamente: em produção, configure os valores no painel do serviço. A chave privada pode ser armazenada com quebras de linha representadas por `\n`; o servidor faz a normalização antes de autenticar.

A Service Account precisa ter permissão de **Editor** na planilha existente. Compartilhe a planilha com o e-mail configurado em `GOOGLE_SERVICE_ACCOUNT_EMAIL`. Nunca coloque credenciais reais no GitHub.

Durante o uso normal da aplicação, somente a aba `Leads` é escrita. As abas `Qualificados` e `Desqualificados` são derivadas por fórmula e só são ajustadas pelo script explícito de migração.

### Estrutura do CRM

A aba `Leads` usa exatamente 22 colunas (A:V), nesta ordem:

1. Lead ID
2. Data de criação
3. Status
4. Nome
5. WhatsApp
6. E-mail
7. Situação atual
8. Principal preocupação
9. Urgência
10. Momento da contratação
11. Motivo da classificação
12. Data de conclusão
13. Consentimento de dados
14. Autorização de contato
15. UTM Source
16. UTM Medium
17. UTM Campaign
18. UTM Content
19. UTM Term
20. FBCLID
21. URL de entrada
22. Dispositivo

`Data de criação` e `Data de conclusão` são geradas exclusivamente no servidor. A data de conclusão permanece vazia durante o preenchimento e é registrada somente após validação e classificação bem-sucedidas. O CRM não mantém Prioridade, DDD, Última etapa, Última atualização, WhatsApp acessado, Data do acesso ao WhatsApp, Data do consentimento ou Referrer.

Antes da primeira operação de cada instância do repositório, o backend valida o cabeçalho `Leads!A1:V1` e mantém o resultado em memória. Append e update aceitam somente arrays com exatamente 22 células; qualquer divergência bloqueia a escrita para evitar deslocamento ou expansão silenciosa da planilha.

### Migração controlada da planilha

A migração nunca roda no startup. A planilha de produção já está na estrutura final de 22 colunas; portanto, estes comandos não são necessários para a operação normal e só devem ser usados em uma migração legada deliberadamente autorizada. Para validar uma estrutura legada sem escrever, use:

```bash
npm run migrate:sheet:dry
```

O script valida as abas `Leads`, `Qualificados`, `Desqualificados` e `Visão geral`, transforma as linhas pelo nome dos cabeçalhos e não imprime dados pessoais. Para aplicar a migração real, depois de revisar o dry-run, defina explicitamente `CONFIRM_SHEET_MIGRATION=true` e execute:

```bash
npm run migrate:sheet
```

A operação reconhece tanto a estrutura antiga de 30 colunas quanto a estrutura final de 22 colunas, preserva os campos mantidos, os Lead IDs e a Data de conclusão, atualiza as fórmulas derivadas para `Leads!A2:V`, ajusta filtros para A:V, mantém a primeira linha congelada, remove formatação condicional exclusiva de Prioridade e exclui fisicamente colunas excedentes. Não execute a migração sem revisar o dry-run e reservar uma janela de manutenção.

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

A função pura `classifyLead` centraliza essas regras e é executada novamente no servidor durante a conclusão. A prioridade interna continua sendo usada apenas para preservar o cálculo do motivo; ela não é persistida nem retornada pela API. Classificação, prioridade e motivo enviados pelo navegador são ignorados.

## WhatsApp

- Número: `5527998737944`
- Mensagem: `Olá, Dra. Priscilla. Acabei de preencher o formulário de análise inicial e gostaria de conversar sobre minha situação.`

O link usa `https://wa.me/`, número somente com dígitos e mensagem codificada com `encodeURIComponent`. Ele só é retornado pelo servidor depois de confirmar que o lead está qualificado. O endpoint não grava o clique no Sheets; o evento `Contact` do Meta Pixel registra o acesso confirmado. Não há redirecionamento automático.

## Meta Pixel

O Pixel ID `959018970525443` é inicializado uma única vez no carregamento real da página. Os eventos configurados são:

- `PageView`: carregamento real da página;
- `FormStarted`: primeiro clique em “Começar”;
- `FormCompleted`: conclusão confirmada pelo backend e pelo Google Sheets;
- `Lead`: somente para leads qualificados pelo backend;
- `Contact`: acesso ao WhatsApp confirmado pelo backend.

Nenhum dado pessoal, resposta do formulário, informação jurídica ou identificador do CRM é enviado como parâmetro à Meta. Advanced Matching e Meta Conversions API (CAPI) não estão implementados.

## Atribuição

No primeiro carregamento são capturados `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid`, URL de entrada e uma categoria genérica de dispositivo. Referrer não é capturado. Esses dados permanecem em memória até a criação do lead e são gravados nas colunas de atribuição da aba `Leads`. Não há armazenamento em `localStorage` ou `sessionStorage`, nem persistência do User-Agent completo.

## Limitações atuais

- O Lead ID permanece somente na memória da página; atualizar a página reinicia a sessão do formulário.
- A idempotência da criação combina uma chave mantida em memória no navegador e no processo do servidor. Não substitui um armazenamento transacional distribuído em ambientes com múltiplas réplicas.
- Não há proteção antispam, limitação de requisições ou Meta Conversions API.
- A URL da Política de Privacidade ainda não está configurada; o ponto futuro está documentado em `app.js` e nenhum link fictício é mostrado.
- Logo e favicons são provisoriamente substituídos por texto.

## Próximas integrações

Em uma fase futura: proteção antispam e limitação de requisições, política de privacidade definitiva, Meta Conversions API e configuração final do ambiente de deploy.
