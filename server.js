import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const app = express();
const port = Number(process.env.PORT) || 3000;
const publicDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');

app.disable('x-powered-by');

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.use(express.static(publicDirectory, {
  dotfiles: 'ignore',
  index: 'index.html',
  redirect: false,
}));

app.listen(port, () => {
  console.log(`Servidor disponível em http://localhost:${port}`);
});

