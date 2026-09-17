// Ponto de integração futuro. A persistência externa NÃO está configurada nesta fase.
// Quando houver um backend, ele deverá validar e classificar o lead novamente antes
// de qualquer persistência. A classificação do navegador não é fonte de verdade.
export const externalPersistenceConfigured = false;

export async function persistLead() {
  throw new Error('Persistência externa não configurada.');
}

