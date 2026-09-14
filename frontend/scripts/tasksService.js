export const API_BASE_URL = 'http://localhost:4000';

function apiError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const tasksService = {
  async getAll() {
    const resposta = await fetch(`${API_BASE_URL}/todos`)
    const dados = await resposta.json();
    return dados.map(t => ({ ...t, done:t.completed }));
  },

  async create({ title }) {
    const resposta = await fetch(`${API_BASE_URL}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw apiError(resposta.status, dados.erro);
    return { ...dados, done: dados.completed };
  },

  async toggle(id) {
    const resposta = await fetch(`${API_BASE_URL}/todos/${id}/toggle`, { method: 'PATCH' });
    const dados = await resposta.json();
    if (!resposta.ok) throw apiError(resposta.status, dados.erro);
    return { ...dados, done: dados.completed };
  },

  async remove(id) {
    const resposta = await fetch(`${API_BASE_URL}/todos/${id}`, { method: 'DELETE' });
    if (!resposta.ok) {
      const dados = await resposta.json();
      throw apiError(resposta.status, dados.erro);
    }
  },

  async health() {
    const resposta = await fetch(`${API_BASE_URL}/health`);
    return await resposta.json();
  },
};

export default tasksService;
