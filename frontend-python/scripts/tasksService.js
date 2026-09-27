// tasksService.js
// -----------------------------------------------------------------------
// Camada de dados isolada para tarefas: chama o backend Python via fetch().
// Igual em espírito à versão do frontend original, mas nesta API as
// tarefas pertencem a um dono — por isso todo método aqui exige o id do
// usuário logado (usuarioId), que quem chama (script.js) obtém de
// authService.getSession(). Este módulo não sabe nada sobre sessão/login;
// só recebe o id e monta a chamada certa (query string ou corpo, conforme
// a rota).
//
// O backend fala `completed`; o resto do app fala `done`. Todo método que
// devolve uma tarefa faz essa tradução (`done: dados.completed`) antes de
// retornar, então script.js nunca precisa saber que o campo no backend
// tem outro nome.
// -----------------------------------------------------------------------

export const API_BASE_URL = 'https://PedroRoss.pythonanywhere.com';

const tasksService = {
  /**
   * Lista as tarefas do usuário.
   * Chamada HTTP: GET /todos?usuario_id=<usuarioId>.
   * Retorno: array de tarefas com `done` adicionado.
   * @throws {Error} com a mensagem de dados.erro se a resposta não for ok
   * (400: usuario_id ausente).
   */
  async getAll(usuarioId) {
    const resposta = await fetch(`${API_BASE_URL}/todos?usuario_id=${usuarioId}`);
    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro);
    }

    return dados.map(t => ({ ...t, done: t.completed }));
  },

  /**
   * Cria uma tarefa para o usuário.
   * Chamada HTTP: POST /todos {title, usuario_id}.
   * Retorno: a tarefa criada, com `done` adicionado.
   * @throws {Error} com a mensagem de dados.erro se a resposta não for ok
   * (400: título vazio, ou usuario_id ausente).
   */
  async create({ title, usuarioId }) {
    const resposta = await fetch(`${API_BASE_URL}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, usuario_id: usuarioId }),
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro);
    }

    return { ...dados, done: dados.completed };
  },

  /**
   * Alterna o estado concluída/pendente de uma tarefa do usuário.
   * Chamada HTTP: PATCH /todos/:id/toggle?usuario_id=<usuarioId>.
   * Retorno: a tarefa já atualizada, com `done` adicionado.
   * @throws {Error} com a mensagem de dados.erro se a resposta não for ok
   * (404: tarefa não existe, ou existe mas não pertence a esse usuarioId).
   */
  async toggle(id, usuarioId) {
    const resposta = await fetch(`${API_BASE_URL}/todos/${id}/toggle?usuario_id=${usuarioId}`, { method: 'PATCH' });
    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro);
    }

    return { ...dados, done: dados.completed };
  },

  /**
   * Exclui uma tarefa do usuário.
   * Chamada HTTP: DELETE /todos/:id?usuario_id=<usuarioId>.
   * Retorno: nada (o backend responde 204 sem corpo em caso de sucesso).
   * @throws {Error} com a mensagem de dados.erro se a resposta não for ok
   * (404: tarefa não existe, ou existe mas não pertence a esse usuarioId)
   * — só nesse caso o corpo é lido.
   */
  async remove(id, usuarioId) {
    const resposta = await fetch(`${API_BASE_URL}/todos/${id}?usuario_id=${usuarioId}`, { method: 'DELETE' });

    if (!resposta.ok) {
      const dados = await resposta.json();
      throw new Error(dados.erro);
    }
  },

  /**
   * Verifica se o backend está disponível.
   * Chamada HTTP: GET /health.
   * Retorno: o corpo da resposta (`{status: 'ok'}`) sem tradução nenhuma.
   */
  async health() {
    const resposta = await fetch(`${API_BASE_URL}/health`);
    return await resposta.json();
  },
};

export default tasksService;
