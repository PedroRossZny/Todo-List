// tasksService.js
// -----------------------------------------------------------------------
// Camada de dados isolada: é o ÚNICO lugar do app que sabe onde as tarefas
// realmente vivem. Hoje simula tudo em memória (array `store`, abaixo);
// quando um dos backends do semestre (JS, Elixir ou Python — todos
// implementando o mesmo contrato REST) estiver de pé, a implementação de
// cada método vira uma chamada fetch() contra API_BASE_URL. `scripts/script.js`
// só chama getAll/create/toggle/remove/health e não precisa mudar quando
// essa troca acontecer.
// -----------------------------------------------------------------------

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

/** Simula a latência de rede da futura API. */
function delay(ms = 150) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cria um erro com `.status`, no mesmo formato que a API real vai devolver
 * (status HTTP + mensagem), para que o restante do app já trate erros reais
 * e simulados da mesma forma.
 */
function apiError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const tasksService = {
  /**
   * Lista todas as tarefas.
   * Hoje: devolve uma cópia do array em memória.
   * Quando plugar a API: vira `fetch(`${API_BASE_URL}/todos`)`.
   * @returns {Promise<{id:number,title:string,done:boolean}[]>}
   */
  async getAll() {
    await delay();
    return store.map(t => ({ ...t }));
  },

  /**
   * Cria uma tarefa a partir do título.
   * Hoje: valida o título (não pode ser vazio/só espaço) e insere no início
   * do array em memória.
   * Quando plugar a API: vira `POST /todos {title}`; a validação passa a ser
   * feita pelo backend, mas o formato do erro continua o mesmo: rejeita com
   * status 400 se o título for inválido.
   * @param {{title: string}} input
   * @returns {Promise<{id:number,title:string,done:boolean}>}
   * @throws {Error} status 400 se o título estiver vazio ou só com espaços.
   */
  async create({ title }) {
    await delay();
    const clean = (title || '').trim();
    if (!clean) throw apiError(400, 'Título é obrigatório.');
    const task = { id: nextId++, title: clean, done: false };
    store.unshift(task);
    return { ...task };
  },

  /**
   * Alterna o estado concluída/pendente de uma tarefa.
   * Hoje: procura a tarefa pelo id no array em memória e inverte `done`.
   * Quando plugar a API: vira `PATCH /todos/:id/toggle`.
   * @param {number} id
   * @returns {Promise<{id:number,title:string,done:boolean}>}
   * @throws {Error} status 404 se não existir tarefa com esse id.
   */
  async toggle(id) {
    await delay();
    const task = store.find(t => t.id === id);
    if (!task) throw apiError(404, 'Tarefa não encontrada.');
    task.done = !task.done;
    return { ...task };
  },

  /**
   * Exclui uma tarefa.
   * Hoje: remove do array em memória pelo id.
   * Quando plugar a API: vira `DELETE /todos/:id`.
   * @param {number} id
   * @returns {Promise<void>}
   * @throws {Error} status 404 se não existir tarefa com esse id.
   */
  async remove(id) {
    await delay();
    const index = store.findIndex(t => t.id === id);
    if (index === -1) throw apiError(404, 'Tarefa não encontrada.');
    store.splice(index, 1);
  },

  /**
   * Verifica se o backend está disponível.
   * Hoje: sempre resolve com sucesso (não há backend real para cair).
   * Quando plugar a API: vira `GET /health`; usado antes de `getAll()` no
   * load inicial para diferenciar "backend fora do ar" de outras falhas.
   * @returns {Promise<{status: string}>}
   */
  async health() {
    await delay(30);
    return { status: 'ok' };
  },
};

export default tasksService;
