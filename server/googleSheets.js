import { google } from 'googleapis';

const SHEET_NAME = 'Leads';
const DATA_RANGE = `'${SHEET_NAME}'!A2:AD`;

export class GoogleSheetsError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = 'GoogleSheetsError';
    this.statusCode = 503;
    this.code = 'SHEETS_UNAVAILABLE';
  }
}

function readConfiguration(environment) {
  const spreadsheetId = environment.GOOGLE_SHEET_ID?.trim();
  const clientEmail = environment.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = environment.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!spreadsheetId || !clientEmail || !privateKey) {
    throw new GoogleSheetsError('A integração com Google Sheets não está configurada.');
  }

  return { spreadsheetId, clientEmail, privateKey };
}

export function createGoogleSheetsRepository({ environment = process.env, sheetsClient } = {}) {
  let client = sheetsClient;
  let spreadsheetId;

  async function getClient() {
    if (client && spreadsheetId) return { client, spreadsheetId };
    const configuration = readConfiguration(environment);
    spreadsheetId = configuration.spreadsheetId;

    if (!client) {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: configuration.clientEmail,
          private_key: configuration.privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      client = google.sheets({ version: 'v4', auth });
    }
    return { client, spreadsheetId };
  }

  async function execute(operation) {
    try {
      return await operation(await getClient());
    } catch (error) {
      if (error instanceof GoogleSheetsError) throw error;
      throw new GoogleSheetsError('Não foi possível concluir a operação no Google Sheets.', error);
    }
  }

  return {
    async append(row) {
      return execute(async ({ client: sheets, spreadsheetId: id }) => {
        const response = await sheets.spreadsheets.values.append({
          spreadsheetId: id,
          range: DATA_RANGE,
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: [row] },
        });
        if (response.data.updates?.updatedRows !== 1) {
          throw new GoogleSheetsError('O Google Sheets não confirmou a criação do lead.');
        }
      });
    },

    async findByLeadId(leadId) {
      return execute(async ({ client: sheets, spreadsheetId: id }) => {
        const response = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: DATA_RANGE });
        const rows = response.data.values ?? [];
        const index = rows.findIndex((row) => row[0] === leadId);
        if (index === -1) return null;
        return { rowNumber: index + 2, row: rows[index] };
      });
    },

    async update(rowNumber, row) {
      return execute(async ({ client: sheets, spreadsheetId: id }) => {
        const response = await sheets.spreadsheets.values.update({
          spreadsheetId: id,
          range: `'${SHEET_NAME}'!A${rowNumber}:AD${rowNumber}`,
          valueInputOption: 'RAW',
          requestBody: { values: [row] },
        });
        if (response.data.updatedRows !== 1) {
          throw new GoogleSheetsError('O Google Sheets não confirmou a atualização do lead.');
        }
      });
    },
  };
}

