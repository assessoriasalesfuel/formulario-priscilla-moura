import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FINAL_HEADERS, OLD_HEADERS, REMOVED_HEADERS, identifyHeaderVersion, runMigration, transformLeadValues,
} from '../scripts/migrateSheetColumns.js';

const environment = {
  GOOGLE_SHEET_ID: '1zzeazzXlD3XI1ZnTQoO9MX27DvqHlionTDPqhHA5UEA',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'migration@example.test',
  GOOGLE_PRIVATE_KEY: 'line-1\\nline-2',
};

function metadataSheet(title, sheetId, migrated = false) {
  return {
    properties: {
      title,
      sheetId,
      gridProperties: { rowCount: 100, columnCount: title === 'Visão geral' ? 10 : migrated ? 22 : 30 },
    },
    conditionalFormats: title === 'Visão geral' ? [] : [
      { ranges: [{ sheetId, startColumnIndex: 3, endColumnIndex: 4 }], booleanRule: { condition: { values: [{ userEnteredValue: 'urgent' }] } } },
      { ranges: [{ sheetId, startColumnIndex: 0, endColumnIndex: 30 }], booleanRule: { condition: { values: [{ userEnteredValue: 'Qualificado' }] } } },
    ],
  };
}

function createSheetsClient() {
  const calls = { batchUpdates: [] };
  const sampleRow = OLD_HEADERS.map((header) => `${header}-valor`);
  return {
    calls,
    spreadsheets: {
      async get() {
        const migrated = calls.batchUpdates.length > 0;
        return {
          data: {
            sheets: [
              metadataSheet('Leads', 1, migrated),
              metadataSheet('Qualificados', 2, migrated),
              metadataSheet('Desqualificados', 3, migrated),
              metadataSheet('Visão geral', 4),
            ],
          },
        };
      },
      values: {
        async batchGet() {
          if (calls.batchUpdates.length > 0) {
            return {
              data: {
                valueRanges: [
                  { values: [FINAL_HEADERS] },
                  { values: [FINAL_HEADERS] },
                  { values: [FINAL_HEADERS] },
                  { values: [[`=IFERROR(QUERY(Leads!A2:V;"select * where C = 'Qualificado'";0);"")`]] },
                  { values: [[`=IFERROR(QUERY(Leads!A2:V;"select * where C = 'Desqualificado'";0);"")`]] },
                ],
              },
            };
          }
          return {
            data: {
              valueRanges: [
                { values: [OLD_HEADERS, sampleRow] },
                { values: [OLD_HEADERS] },
                { values: [OLD_HEADERS] },
                { values: [['Total de leads', '=COUNTA(Leads!A2:A)'], ['Qualificados', '=COUNTIF(Leads!C:C;"Qualificado")']] },
              ],
            },
          };
        },
      },
      async batchUpdate(options) {
        calls.batchUpdates.push(options);
        return { data: {} };
      },
    },
  };
}

test('modelo final possui exatamente as 22 colunas aprovadas', () => {
  assert.equal(FINAL_HEADERS.length, 22);
  assert.deepEqual(FINAL_HEADERS, [
    'Lead ID', 'Data de criação', 'Status', 'Nome', 'WhatsApp', 'E-mail', 'Situação atual',
    'Principal preocupação', 'Urgência', 'Momento da contratação', 'Motivo da classificação', 'Data de conclusão',
    'Consentimento de dados', 'Autorização de contato', 'UTM Source', 'UTM Medium', 'UTM Campaign',
    'UTM Content', 'UTM Term', 'FBCLID', 'URL de entrada', 'Dispositivo',
  ]);
});

test('modelo final exclui exatamente os oito cabeçalhos removidos', () => {
  assert.deepEqual(REMOVED_HEADERS, [
    'Prioridade', 'DDD', 'Última etapa', 'Última atualização', 'WhatsApp acessado',
    'Data do acesso ao WhatsApp', 'Data do consentimento', 'Referrer',
  ]);
  REMOVED_HEADERS.forEach((header) => assert.equal(FINAL_HEADERS.includes(header), false));
});

test('transformação usa nomes dos cabeçalhos e preserva Lead ID', () => {
  const shuffled = [...OLD_HEADERS].reverse();
  const row = shuffled.map((header) => `${header}-valor`);
  const transformed = transformLeadValues([shuffled, row]);
  assert.deepEqual(transformed[0], FINAL_HEADERS);
  assert.equal(transformed[1][0], 'Lead ID-valor');
  assert.equal(transformed[1][3], 'Nome-valor');
  assert.equal(transformed[1][11], 'Data de conclusão-valor');
  assert.equal(transformed[1].length, 22);
});

test('estrutura final de 22 colunas é reconhecida e transformada de forma idempotente', () => {
  assert.equal(identifyHeaderVersion(FINAL_HEADERS), 'final');
  const finalRow = FINAL_HEADERS.map((header) => `${header}-valor`);
  assert.deepEqual(transformLeadValues([FINAL_HEADERS, finalRow]), [FINAL_HEADERS, finalRow]);
});

test('migração aborta quando cabeçalhos estão incompletos', () => {
  assert.throws(() => identifyHeaderVersion(OLD_HEADERS.slice(0, -1)), /cabeçalhos/u);
});

test('migração real é bloqueada sem confirmação explícita', async () => {
  const sheetsClient = createSheetsClient();
  await assert.rejects(
    () => runMigration({ environment, sheetsClient }),
    /CONFIRM_SHEET_MIGRATION=true/u,
  );
  assert.equal(sheetsClient.calls.batchUpdates.length, 0);
});

test('dry-run valida e transforma sem escrever', async () => {
  const sheetsClient = createSheetsClient();
  const summary = await runMigration({ dryRun: true, environment, sheetsClient });
  assert.equal(summary.rows, 1);
  assert.equal(summary.currentColumns, 30);
  assert.equal(summary.finalColumns, 22);
  assert.deepEqual(summary.removedHeaders, REMOVED_HEADERS);
  assert.equal(sheetsClient.calls.batchUpdates.length, 0);
});

test('migração confirmada prepara fórmulas, filtros e remoção física das colunas excedentes', async () => {
  const sheetsClient = createSheetsClient();
  const result = await runMigration({
    environment: { ...environment, CONFIRM_SHEET_MIGRATION: 'true' },
    sheetsClient,
  });
  assert.equal(result.migrated, true);
  assert.equal(sheetsClient.calls.batchUpdates.length, 1);
  const requests = sheetsClient.calls.batchUpdates[0].requestBody.requests;
  assert.equal(requests.filter((request) => request.deleteDimension).length, 3);
  assert.equal(requests.filter((request) => request.setBasicFilter).length, 3);
  assert.equal(requests.filter((request) => request.deleteConditionalFormatRule).length, 3);
  assert.equal(JSON.stringify(requests).includes('"sheetId":4'), false);
  const formulas = requests
    .filter((request) => request.updateCells?.rows?.[0]?.values?.[0]?.userEnteredValue?.formulaValue)
    .map((request) => request.updateCells.rows[0].values[0].userEnteredValue.formulaValue);
  assert.deepEqual(formulas, [
    `=IFERROR(QUERY(Leads!A2:V;"select * where C = 'Qualificado'";0);"")`,
    `=IFERROR(QUERY(Leads!A2:V;"select * where C = 'Desqualificado'";0);"")`,
  ]);
});
