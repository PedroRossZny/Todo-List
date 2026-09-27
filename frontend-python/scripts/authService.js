// authService.js
// -----------------------------------------------------------------------
// Camada de dados isolada para autenticação: é o único lugar do app que
// fala com /register e /login, e o único que toca localStorage para saber
// quem está logado. script.js só chama register/login/getSession/
// saveSession/clearSession e nunca faz fetch() nem lê localStorage
// diretamente.
//
// Esta fase do projeto ainda não tem sessão/token no backend — "estar
// logado" é só guardar o {id, username} devolvido por /register ou /login.
// Por isso é a única parte do app que usa localStorage para guardar dado
// de domínio (em vez de só preferência de UI, como o tema): é literalmente
// a única informação de sessão que existe nesta fase.
// -----------------------------------------------------------------------

export const API_BASE_URL = 'http://127.0.0.1:5000';

const SESSION_KEY = 'flow-python-session';

const authService = {
  /**
   * Cria uma conta nova.
   * Chamada HTTP: POST /register {username, senha}.
   * Retorno: {id, username} da conta criada.
   * @throws {Error} com a mensagem de dados.erro se a resposta não for ok
   * (400: username vazio, username já existe, ou senha com menos de 4
   * caracteres).
   */
  async register({ username, senha }) {
    const resposta = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, senha }),
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro);
    }

    return dados;
  },

  /**
   * Autentica uma conta existente.
   * Chamada HTTP: POST /login {username, senha}.
   * Retorno: {id, username} da conta autenticada.
   * @throws {Error} com a mensagem de dados.erro se a resposta não for ok
   * (401: username ou senha inválidos).
   */
  async login({ username, senha }) {
    const resposta = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, senha }),
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro);
    }

    return dados;
  },

  /**
   * Verifica se o backend está disponível.
   * Chamada HTTP: GET /health.
   * Retorno: o corpo da resposta (`{status: 'ok'}`).
   */
  async health() {
    const resposta = await fetch(`${API_BASE_URL}/health`);
    return await resposta.json();
  },

  /** Guarda a sessão atual ({id, username}) em localStorage. */
  saveSession(user) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch { /* sessão não persiste entre reloads nesta aba, mas o login em si funciona */ }
  },

  /** Lê a sessão salva, se houver. Retorna null se não houver nenhuma. */
  getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /** Remove a sessão salva (logout). */
  clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* nada salvo pra remover mesmo */ }
  },
};

export default authService;
