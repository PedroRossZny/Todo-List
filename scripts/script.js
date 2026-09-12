import tasksService from './tasksService.js';

const $ = s => document.querySelector(s);
const esc = t => { const e = document.createElement('div'); e.textContent = t; return e.innerHTML; };

const sortLabels = { created: 'mais recentes', alpha: 'ordem alfabética' };
const state = { filter: 'all', search: '', sort: 'created' };
let allTasks = [];

let toastTimer = null;
function toast(message, type = 'success') {
  const el = $('#toast');
  el.textContent = message;
  el.classList.toggle('error', type === 'error');
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

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

function renderCounts() {
  $('#count-all').textContent = allTasks.length;
  $('#count-pending').textContent = allTasks.filter(t => !t.done).length;
  $('#count-done').textContent = allTasks.filter(t => t.done).length;
}

function renderEmptyState(tasks) {
  const el = $('#empty-state');
  if (tasks.length !== 0) { el.hidden = true; return; }
  el.hidden = false;
  const filtering = state.filter !== 'all' || state.search.trim() !== '';
  el.innerHTML = filtering
    ? `<div>⌕</div><h2>Nenhuma tarefa encontrada</h2><p>Tente ajustar a busca ou o filtro selecionado.</p><button class="clear-filter-button" id="clear-search-filter">Limpar busca e filtro</button>`
    : `<div>☁</div><h2>Nada por aqui</h2><p>Que tal criar uma nova tarefa para começar?</p><button class="new-task-button" data-open-modal>＋ Nova tarefa</button>`;
}

function renderTasks(tasks) {
  $('#tasks-list').innerHTML = tasks.map(t => `
    <article class="task ${t.done ? 'done' : ''}" data-id="${t.id}">
      <input class="task-check" type="checkbox" ${t.done ? 'checked' : ''}>
      <div class="task-main"><div class="task-name">${esc(t.title)}</div></div>
      <button class="task-delete" title="Excluir tarefa">✕</button>
    </article>`).join('');
  $('#tasks-list').hidden = tasks.length === 0;
  $('#task-summary').textContent = `${tasks.length} ${tasks.length === 1 ? 'tarefa' : 'tarefas'}`;
  renderEmptyState(tasks);
}

function renderProgress() {
  const done = allTasks.filter(t => t.done).length;
  const total = allTasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  $('#progress-bar').style.width = pct + '%';
  $('#weekly-progress').textContent = pct + '%';
  $('#completed-week').textContent = done;
  $('#weekly-total').textContent = total;
}

function renderAll() {
  renderCounts();
  renderTasks(visibleTasks());
  renderProgress();
}

function showLoading() {
  $('#loading-state').hidden = false;
  $('#error-banner').hidden = true;
  $('#task-toolbar').hidden = true;
  $('#tasks-list').hidden = true;
  $('#empty-state').hidden = true;
}

function showLoadError(err) {
  $('#loading-state').hidden = true;
  $('#task-toolbar').hidden = true;
  $('#tasks-list').hidden = true;
  $('#empty-state').hidden = true;
  $('#error-banner-text').textContent = err.message || 'Não foi possível carregar suas tarefas. Verifique sua conexão.';
  $('#error-banner').hidden = false;
}

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

function openModal() {
  $('#task-title').value = '';
  $('#modal-backdrop').hidden = false;
  setTimeout(() => $('#task-title').focus(), 50);
}
function closeModal() {
  $('#modal-backdrop').hidden = true;
  $('#task-form').reset();
}

document.addEventListener('click', async e => {
  if (e.target.closest('#open-task-modal,[data-open-modal]')) { openModal(); return; }
  if (e.target.closest('.close-modal,.cancel-button') || e.target === $('#modal-backdrop')) { closeModal(); return; }

  if (e.target.closest('#clear-search-filter')) {
    state.filter = 'all';
    state.search = '';
    $('#search-input').value = '';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.filter === 'all'));
    renderTasks(visibleTasks());
    return;
  }

  if (e.target.closest('#retry-load')) { load(); return; }

  const nav = e.target.closest('.nav-item');
  if (nav) {
    state.filter = nav.dataset.filter;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el === nav));
    renderTasks(visibleTasks());
    $('#sidebar').classList.remove('open');
    return;
  }

  if (e.target.closest('#sort-toggle')) {
    state.sort = state.sort === 'created' ? 'alpha' : 'created';
    $('#sort-toggle').textContent = `↕ Ordenar por: ${sortLabels[state.sort]}`;
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

  if (e.target.closest('#theme-toggle')) {
    document.body.classList.toggle('dark');
    $('#theme-toggle').textContent = document.body.classList.contains('dark') ? '☀' : '☾';
    return;
  }
  if (e.target.closest('#mobile-menu')) { $('#sidebar').classList.toggle('open'); return; }
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

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); openModal(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#search-input').focus(); }
  if (e.key === 'Escape') { closeModal(); $('#sidebar').classList.remove('open'); }
});

load();
