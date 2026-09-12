// script.js
// -----------------------------------------------------------------------
// Camada de UI: renderiza a lista de tarefas e liga os elementos de
// index.html aos eventos do usuário (criar, concluir, excluir, filtrar,
// buscar, ordenar, tema, sidebar mobile, modal). Não conhece de onde os
// dados vêm — toda leitura/escrita passa por tasksService (getAll/create/
// toggle/remove/health), que é o único módulo que sabe se os dados estão
// em memória ou vindo de uma API real.
// -----------------------------------------------------------------------
import tasksService from './tasksService.js';

// Atalho para document.querySelector.
const $ = s => document.querySelector(s);
// Escapa texto para uso seguro como conteúdo de elemento (ex.: nome da tarefa).
const esc = t => { const e = document.createElement('div'); e.textContent = t; return e.innerHTML; };
// Mesma escapagem de esc(), mas também trata aspas simples/duplas — usar
// sempre que o valor for interpolado dentro de um atributo (ex.: aria-label),
// nunca só esc(), senão um título com aspas quebra o HTML do atributo.
const escAttr = t => esc(t).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// --- Estado e seleção de tarefas visíveis ---
const sortLabels = { created: 'mais recentes', alpha: 'ordem alfabética' };
const state = { filter: 'all', search: '', sort: 'created' };
let allTasks = [];

// --- Renderização ---
// Mostra uma mensagem passageira no rodapé da tela; type 'error' troca a cor
// para deixar claro que algo deu errado (mesmo componente para sucesso e erro).
let toastTimer = null;
function toast(message, type = 'success') {
  const el = $('#toast');
  el.textContent = message;
  el.classList.toggle('error', type === 'error');
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

// Aplica, nessa ordem, filtro de status -> busca por título -> ordenação, sobre
// todas as tarefas carregadas. A ordem importa: filtrar antes de buscar evita
// vasculhar tarefas que nem apareceriam na view atual, e ordenar por último
// garante que o resultado final (o que a lista realmente mostra) saia ordenado.
function visibleTasks() {
  let list = allTasks.filter(t => {
    if (state.filter === 'pending') return !t.done;
    if (state.filter === 'done') return t.done;
    return true;
  });
  const q = state.search.trim().toLowerCase();
  if (q) list = list.filter(t => t.title.toLowerCase().includes(q));
  if (state.sort === 'alpha') list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  return list;
}

// Atualiza os contadores da sidebar (Todas/Pendentes/Concluídas). Sempre usa
// allTasks (não a lista filtrada), porque o contador deve refletir o total
// real de cada status, mesmo com busca ou outro filtro ativo.
function renderCounts() {
  $('#count-all').textContent = allTasks.length;
  $('#count-pending').textContent = allTasks.filter(t => !t.done).length;
  $('#count-done').textContent = allTasks.filter(t => t.done).length;
}

// Mostra o estado vazio quando a lista renderizada não tem itens - mas com
// texto diferente dependendo do motivo, pra não confundir o usuário: se há
// filtro/busca ativo, o problema é o filtro atual ("nenhum resultado", com
// botão pra limpar); se não há filtro nenhum, é que realmente não existe
// nenhuma tarefa ainda ("nada por aqui", com botão pra criar a primeira).
function renderEmptyState(tasks) {
  const el = $('#empty-state');
  if (tasks.length !== 0) { el.hidden = true; return; }
  el.hidden = false;
  const filtering = state.filter !== 'all' || state.search.trim() !== '';
  el.innerHTML = filtering
    ? `<div aria-hidden="true">⌕</div><h2>Nenhuma tarefa encontrada</h2><p>Tente ajustar a busca ou o filtro selecionado.</p><button class="clear-filter-button" id="clear-search-filter">Limpar busca e filtro</button>`
    : `<div aria-hidden="true">☁</div><h2>Nada por aqui</h2><p>Que tal criar uma nova tarefa para começar?</p><button class="new-task-button" data-open-modal><span aria-hidden="true">＋</span> Nova tarefa</button>`;
}

// Desenha a lista de tarefas (já filtrada/ordenada) e, em seguida, o resumo
// e o estado vazio, que dependem do mesmo array `tasks`.
function renderTasks(tasks) {
  $('#tasks-list').innerHTML = tasks.map(t => `
    <article class="task ${t.done ? 'done' : ''}" data-id="${t.id}">
      <input class="task-check" type="checkbox" ${t.done ? 'checked' : ''} aria-label="Marcar &quot;${escAttr(t.title)}&quot; como ${t.done ? 'não concluída' : 'concluída'}">
      <div class="task-main"><div class="task-name">${esc(t.title)}</div></div>
      <button class="task-delete" title="Excluir tarefa" aria-label="Excluir tarefa: ${escAttr(t.title)}">✕</button>
    </article>`).join('');
  $('#tasks-list').hidden = tasks.length === 0;
  $('#task-summary').textContent = `${tasks.length} ${tasks.length === 1 ? 'tarefa' : 'tarefas'}`;
  renderEmptyState(tasks);
}

// Atualiza a barra e o texto de progresso semanal na sidebar, sempre com base
// no total de tarefas (allTasks), não na lista filtrada.
function renderProgress() {
  const done = allTasks.filter(t => t.done).length;
  const total = allTasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  $('#progress-bar').style.width = pct + '%';
  $('#weekly-progress').textContent = pct + '%';
  $('#completed-week').textContent = done;
  $('#weekly-total').textContent = total;
}

// Redesenha a tela inteira (contadores, lista, progresso) - chamada depois
// que allTasks muda, tipicamente após um load() bem-sucedido.
function renderAll() {
  renderCounts();
  renderTasks(visibleTasks());
  renderProgress();
}

// Esconde tudo (toolbar, lista, vazio, erro) e mostra só o aviso de
// carregando, enquanto load() aguarda a resposta do tasksService.
function showLoading() {
  $('#loading-state').hidden = false;
  $('#error-banner').hidden = true;
  $('#task-toolbar').hidden = true;
  $('#tasks-list').hidden = true;
  $('#empty-state').hidden = true;
}

// Mostra o banner de erro (com botão "Tentar novamente") no lugar da lista,
// usado quando o health check ou o carregamento das tarefas falha.
function showLoadError(err) {
  $('#loading-state').hidden = true;
  $('#task-toolbar').hidden = true;
  $('#tasks-list').hidden = true;
  $('#empty-state').hidden = true;
  $('#error-banner-text').textContent = err.message || 'Não foi possível carregar suas tarefas. Verifique sua conexão.';
  $('#error-banner').hidden = false;
}

// Carrega as tarefas do zero: primeiro checa a saúde do backend (hoje sempre
// ok, simulado), depois busca a lista. Chamada no boot e sempre que uma ação
// (criar/concluir/excluir) precisa reconciliar o estado local com a "fonte
// da verdade" do tasksService.
async function load() {
  showLoading();
  try {
    await tasksService.health();
    allTasks = await tasksService.getAll();
    $('#loading-state').hidden = true;
    $('#error-banner').hidden = true;
    $('#task-toolbar').hidden = false;
    renderAll();
  } catch (err) {
    showLoadError(err);
  }
}

// Abre/fecha a sidebar no layout mobile e mantém aria-expanded em sincronia.
function setSidebarOpen(open) {
  $('#sidebar').classList.toggle('open', open);
  $('#mobile-menu').setAttribute('aria-expanded', String(open));
}
function toggleSidebar() { setSidebarOpen(!$('#sidebar').classList.contains('open')); }

// Marca qual item de status fica ativo na sidebar - único lugar que decide
// isso, usado tanto ao clicar num item de nav quanto ao resetar a view.
function setActiveFilter(filter) {
  state.filter = filter;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.filter === filter));
}

// Volta para a visão padrão (Todas, sem busca) - usado pelo logo "flow" e
// pelo botão "Limpar busca e filtro" do estado vazio.
function resetView() {
  setActiveFilter('all');
  state.search = '';
  $('#search-input').value = '';
  renderTasks(visibleTasks());
  setSidebarOpen(false);
}

// --- Tema ---
// Aplica o tema na tela (classe no body + ícone/aria-label do botão), sem
// mexer em persistência - é o passo comum entre setTheme() e initTheme().
function applyTheme(dark) {
  document.body.classList.toggle('dark', dark);
  $('#theme-toggle').textContent = dark ? '☀' : '☾';
  $('#theme-toggle').setAttribute('aria-label', dark ? 'Ativar modo claro' : 'Ativar modo escuro');
}
// Troca o tema por ação do usuário (clique no botão) e grava a escolha.
function setTheme(dark) {
  applyTheme(dark);
  try { localStorage.setItem('flow-theme', dark ? 'dark' : 'light'); } catch { /* preferência não persistida, tema ainda funciona nesta sessão */ }
}
// Define o tema no carregamento da página: usa a preferência salva se houver,
// senão segue o tema do sistema operacional (prefers-color-scheme).
function initTheme() {
  let stored = null;
  try { stored = localStorage.getItem('flow-theme'); } catch { /* localStorage indisponível, cai para a preferência do sistema */ }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(stored ? stored === 'dark' : prefersDark);
}

// --- Atalhos de teclado ---
// Troca o símbolo "⌘" exibido nos atalhos por "Ctrl" fora do Mac - os
// atalhos em si (Ctrl/Cmd+N, Ctrl/Cmd+K) já funcionam nos dois; isto só
// corrige a dica visual.
function initShortcutLabels() {
  if (/Mac|iPod|iPhone|iPad/.test(navigator.platform)) return;
  $('#shortcut-new').textContent = 'Ctrl N';
  $('#shortcut-search').textContent = 'Ctrl K';
}

// --- Modal e foco ---
// Guarda o elemento focado antes de abrir o modal, para devolver o foco a
// ele quando o modal fechar (acessibilidade: quem abriu não "perde o lugar").
let lastFocusedBeforeModal = null;
// Abre o modal de nova tarefa, limpando campo e contador de caracteres.
function openModal() {
  lastFocusedBeforeModal = document.activeElement;
  $('#task-title').value = '';
  $('#title-counter').textContent = '0/100';
  $('#modal-backdrop').hidden = false;
  setTimeout(() => $('#task-title').focus(), 50);
}
// Fecha o modal e devolve o foco a quem o abriu. O guard no início evita
// devolver foco/mexer no form quando o modal já está fechado (ex.: Esc
// pressionado sem modal aberto, só para fechar a sidebar mobile).
function closeModal() {
  if ($('#modal-backdrop').hidden) return;
  $('#modal-backdrop').hidden = true;
  $('#task-form').reset();
  lastFocusedBeforeModal?.focus();
}
// Lista os campos/botões do modal que podem receber foco, na ordem do DOM -
// usada por trapModalFocus para saber onde o ciclo de Tab começa e termina.
function focusableModalElements() {
  return [...$('#task-form').querySelectorAll('input,button')].filter(el => !el.disabled);
}
// Prende o foco dentro do modal enquanto ele está aberto: sem isso, Tab/
// Shift+Tab vazariam para elementos da página atrás do modal, o que é
// confuso para quem navega só pelo teclado.
function trapModalFocus(e) {
  if (e.key !== 'Tab' || $('#modal-backdrop').hidden) return;
  const focusable = focusableModalElements();
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

// --- Event listeners ---
document.addEventListener('click', async e => {
  if (e.target.closest('#open-task-modal,[data-open-modal]')) { openModal(); return; }
  if (e.target.closest('.close-modal,.cancel-button') || e.target === $('#modal-backdrop')) { closeModal(); return; }

  if (e.target.closest('#clear-search-filter,#brand-home')) { resetView(); return; }

  if (e.target.closest('#retry-load')) { load(); return; }

  const nav = e.target.closest('.nav-item');
  if (nav) {
    setActiveFilter(nav.dataset.filter);
    renderTasks(visibleTasks());
    setSidebarOpen(false);
    return;
  }

  if (e.target.closest('#sort-toggle')) {
    state.sort = state.sort === 'created' ? 'alpha' : 'created';
    $('#sort-toggle').innerHTML = `<span aria-hidden="true">↕</span> Ordenar por: ${sortLabels[state.sort]}`;
    renderTasks(visibleTasks());
    return;
  }

  const task = e.target.closest('.task');
  if (task && e.target.matches('.task-check')) {
    const id = Number(task.dataset.id);
    const wasChecked = e.target.checked;
    e.target.disabled = true;
    try {
      await tasksService.toggle(id);
      toast(wasChecked ? 'Tarefa concluída. Muito bem!' : 'Tarefa reaberta.');
    } catch (err) {
      toast(err.message || 'Não foi possível atualizar a tarefa.', 'error');
    }
    await load();
    return;
  }
  if (task && e.target.closest('.task-delete')) {
    const id = Number(task.dataset.id);
    try {
      await tasksService.remove(id);
      toast('Tarefa excluída.');
    } catch (err) {
      toast(err.message || 'Não foi possível excluir a tarefa.', 'error');
    }
    await load();
    return;
  }

  if (e.target.closest('#theme-toggle')) { setTheme(!document.body.classList.contains('dark')); return; }
  if (e.target.closest('#mobile-menu')) { toggleSidebar(); return; }
});

$('#task-form').addEventListener('submit', async e => {
  e.preventDefault();
  const title = $('#task-title').value;
  const button = $('.save-button');
  button.disabled = true;
  button.textContent = 'Criando…';
  try {
    await tasksService.create({ title });
    toast('Nova tarefa criada.');
    closeModal();
    await load();
  } catch (err) {
    toast(err.message || 'Não foi possível criar a tarefa.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Criar tarefa';
  }
});

$('#search-input').addEventListener('input', e => {
  state.search = e.target.value;
  renderTasks(visibleTasks());
});

$('#task-title').addEventListener('input', e => {
  $('#title-counter').textContent = `${e.target.value.length}/100`;
});

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); openModal(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#search-input').focus(); }
  if (e.key === 'Escape') { closeModal(); setSidebarOpen(false); }
  trapModalFocus(e);
});

initTheme();
initShortcutLabels();
load();
