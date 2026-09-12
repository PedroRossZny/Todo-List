// Camada de dados isolada. Hoje simula os dados em memória; quando um backend
// real (JS, Elixir ou Python) estiver disponível, troque a implementação dos
// métodos abaixo por chamadas fetch() contra API_BASE_URL — o resto do app só
// conhece getAll/create/toggle/remove e não precisa mudar.
export const API_BASE_URL = ''; // ex.: 'http://localhost:4000' quando plugar um backend real

let nextId = 1;
const store = [
  { id: nextId++, title: 'Finalizar apresentação para o cliente', done: false },
  { id: nextId++, title: 'Reunião de alinhamento semanal', done: false },
  { id: nextId++, title: 'Responder e-mails pendentes', done: false },
  { id: nextId++, title: 'Comprar ingredientes para o jantar', done: false },
  { id: nextId++, title: 'Organizar referências do projeto', done: true },
  { id: nextId++, title: 'Revisar planejamento mensal', done: false },
];

function delay(ms = 150) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function apiError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const tasksService = {
  async getAll() {
    await delay();
    return store.map(t => ({ ...t }));
  },

  async create({ title }) {
    await delay();
    const clean = (title || '').trim();
    if (!clean) throw apiError(400, 'Título é obrigatório.');
    const task = { id: nextId++, title: clean, done: false };
    store.unshift(task);
    return { ...task };
  },

  async toggle(id) {
    await delay();
    const task = store.find(t => t.id === id);
    if (!task) throw apiError(404, 'Tarefa não encontrada.');
    task.done = !task.done;
    return { ...task };
  },

  async remove(id) {
    await delay();
    const index = store.findIndex(t => t.id === id);
    if (index === -1) throw apiError(404, 'Tarefa não encontrada.');
    store.splice(index, 1);
  },

  async health() {
    await delay(30);
    return { status: 'ok' };
  },
};

export default tasksService;
