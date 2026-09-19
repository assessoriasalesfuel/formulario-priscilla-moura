import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleSheetsRepository, GoogleSheetsError } from '../server/googleSheets.js';

const environment = {
  GOOGLE_SHEET_ID: 'sheet-id',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'service@example.test',
  GOOGLE_PRIVATE_KEY: 'line-1\\nline-2',
};

function createClient() {
  const calls = [];
  return {
    calls,
    spreadsheets: {
      values: {
        async append(options) {
          calls.push(['append', options]);
          return { data: { updates: { updatedRows: 1 } } };
        },
        async get(options) {
          calls.push(['get', options]);
          return { data: { values: [['id-1', 'A'], ['id-2', 'B']] } };
        },
        async update(options) {
          calls.push(['update', options]);
          return { data: { updatedRows: 1 } };
        },
      },
    },
  };
}

test('repositório do Sheets usa escrita RAW e somente a aba Leads', async () => {
  const client = createClient();
  const repository = createGoogleSheetsRepository({ environment, sheetsClient: client });
  await repository.append(['id-1', '=literal']);
  const options = client.calls[0][1];
  assert.equal(options.spreadsheetId, 'sheet-id');
  assert.equal(options.range, "'Leads'!A2:AD");
  assert.equal(options.valueInputOption, 'RAW');
});

test('localiza linha por Lead ID sem aceitar índice do cliente', async () => {
  const repository = createGoogleSheetsRepository({ environment, sheetsClient: createClient() });
  assert.deepEqual(await repository.findByLeadId('id-2'), { rowNumber: 3, row: ['id-2', 'B'] });
  assert.equal(await repository.findByLeadId('ausente'), null);
});

test('atualiza a faixa correspondente à linha localizada', async () => {
  const client = createClient();
  const repository = createGoogleSheetsRepository({ environment, sheetsClient: client });
  await repository.update(7, ['id-7']);
  const options = client.calls[0][1];
  assert.equal(options.range, "'Leads'!A7:AD7");
  assert.equal(options.valueInputOption, 'RAW');
});

test('rejeita configuração ausente sem expor credenciais', async () => {
  const repository = createGoogleSheetsRepository({ environment: {}, sheetsClient: createClient() });
  await assert.rejects(
    () => repository.append(['id']),
    (error) => error instanceof GoogleSheetsError && error.code === 'SHEETS_UNAVAILABLE',
  );
});
