// tasksService.js
// -----------------------------------------------------------------------
// Camada de dados isolada: é o único lugar do app que sabe onde as tarefas
// realmente vivem. Chama de verdade um dos backends via fetch(). script.js
// só chama getAll/create/toggle/remove/health e não sabe (nem precisa saber)
// que por trás disso existe uma API HTTP.
//
// Os backends em BACKENDS implementam exatamente o mesmo contrato REST, cada
// um num paradigma diferente. Trocar de backend é só trocar a URL usada
// pelas chamadas; nada mais no frontend muda. A escolha fica salva no
// navegador (como o tema), por ser preferência de interface.
//
// O backend fala `completed`; o resto do app fala `done`. Cada método que
// devolve uma tarefa faz essa tradução (`done: dados.completed`) antes de
// retornar, então script.js nunca precisa saber que o campo no backend
// tem outro nome.
// -----------------------------------------------------------------------

// Para rodar localmente, troque as URLs por http://localhost:4000 (JS) e
// http://localhost:4001 (Elixir).
export const BACKENDS = {
  js: { nome: 'JavaScript (imperativo)', url: 'https://todo-list-backend-6weg.onrender.com' },
  elixir: { nome: 'Elixir (funcional)', url: 'https://todo-list-backend-elixir.onrender.com' },
};

const CHAVE_BACKEND = 'flow-backend';

// Lê o backend escolhido da última vez; se não houver (ou for inválido), usa o JS.
function backendSalvo() {
  try {
    const salvo = localStorage.getItem(CHAVE_BACKEND);
    if (salvo && salvo in BACKENDS) return salvo;
  } catch { /* localStorage indisponível: usa o padrão */ }
  return 'js';
}

let backendAtual = backendSalvo();

// URL base do backend em uso agora.
function urlAtual() {
  return BACKENDS[backendAtual].url;
}

const tasksService = {
  /** Chave do backend em uso ('js' ou 'elixir'). */
  getBackend() {
    return backendAtual;
  },

  /**
   * Passa a usar outro backend nas próximas chamadas e salva a escolha.
   * Não recarrega nada sozinho: quem chama decide quando buscar a lista de novo.
   */
  setBackend(chave) {
    if (!(chave in BACKENDS)) return;
    backendAtual = chave;
    try { localStorage.setItem(CHAVE_BACKEND, chave); } catch { /* escolha vale só nesta sessão */ }
  },

  /**
   * Lista todas as tarefas.
   * Chamada HTTP: GET /todos.
   * Retorno: array de tarefas com `done` adicionado (traduzido de `completed`),
   * mantendo os demais campos originais do backend.
   * Nota: ao contrário de create/toggle/remove, não confere `resposta.ok` —
   * uma resposta de erro do backend ainda seria processada como se fosse a
   * lista de tarefas.
   */
  async getAll() {
    const resposta = await fetch(`${urlAtual()}/todos`);
    const dados = await resposta.json();
    return dados.map(t => ({ ...t, done: t.completed}));
  },

  /**
   * Cria uma tarefa a partir do título.
   * Chamada HTTP: POST /todos {title}.
   * Retorno: a tarefa criada pelo backend, com `done` adicionado.
   * @throws {Error} com a mensagem vinda de `dados.erro` se a resposta não
   * for ok (ex.: título vazio, 400).
   */
  async create( { title } ) {
    const resposta = await fetch(`${urlAtual()}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro);
    }

    return { ...dados, done: dados.completed };
  },

  /**
   * Alterna o estado concluída/pendente de uma tarefa.
   * Chamada HTTP: PATCH /todos/:id/toggle.
   * Retorno: a tarefa já atualizada, com `done` adicionado.
   * @throws {Error} com a mensagem vinda de `dados.erro` se a resposta não
   * for ok (ex.: id inexistente, 404).
   */
  async toggle(id) {
    const resposta = await fetch(`${urlAtual()}/todos/${id}/toggle`, { method: 'PATCH' });
    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro);
    }

    return { ...dados, done: dados.completed };
  },

  /**
   * Exclui uma tarefa.
   * Chamada HTTP: DELETE /todos/:id.
   * Retorno: nada (o backend responde 204 sem corpo em caso de sucesso).
   * @throws {Error} com a mensagem vinda de `dados.erro` se a resposta não
   * for ok (ex.: id inexistente, 404) — só nesse caso o corpo é lido.
   */
  async remove(id) {
    const resposta = await fetch(`${urlAtual()}/todos/${id}`, { method: 'DELETE' });

    if (!resposta.ok) {
      const dados = await resposta.json();
      throw new Error(dados.erro);
    }
  },

  /**
   * Verifica se o backend está disponível.
   * Chamada HTTP: GET /health.
   * Retorno: o corpo da resposta (`{status: 'ok'}`) sem tradução nenhuma.
   * Nota: assim como getAll, não confere `resposta.ok`.
   */
  async health() {
    const resposta = await fetch(`${urlAtual()}/health`)
    return await resposta.json();
  }
};

export default tasksService;
