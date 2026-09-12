import tasksService from './tasksService.js';

const $ = s => document.querySelector(s);
const esc = t => { const e = document.createElement('div'); e.textContent = t; return e.innerHTML; };

const sortLabels = { created: 'mais recentes', alpha: 'ordem alfabética' };
const state = { filter: 'all', search: '', sort: 'created' };
let allTasks = [];

let toastTimer = null;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
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

function renderTasks(tasks) {
  $('#tasks-list').innerHTML = tasks.map(t => `
    <article class="task ${t.done ? 'done' : ''}" data-id="${t.id}">
      <input class="task-check" type="checkbox" ${t.done ? 'checked' : ''}>
      <div class="task-main"><div class="task-name">${esc(t.title)}</div></div>
      <button class="task-delete" title="Excluir tarefa">✕</button>
    </article>`).join('');
  $('#empty-state').hidden = tasks.length !== 0;
  $('#tasks-list').hidden = tasks.length === 0;
  $('#task-summary').textContent = `${tasks.length} ${tasks.length === 1 ? 'tarefa' : 'tarefas'}`;
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

async function load() {
  allTasks = await tasksService.getAll();
  renderAll();
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

  const nav = e.target.closest('.nav-item');
  if (nav) {
    state.filter = nav.dataset.filter;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el === nav));
    renderTasks(visibleTasks());
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
    try {
      await tasksService.toggle(id);
      toast(wasChecked ? 'Tarefa concluída. Muito bem!' : 'Tarefa reaberta.');
    } catch (err) {
      toast(err.message || 'Não foi possível atualizar a tarefa.');
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
      toast(err.message || 'Não foi possível excluir a tarefa.');
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
  try {
    await tasksService.create({ title });
    toast('Nova tarefa criada.');
    closeModal();
    await load();
  } catch (err) {
    toast(err.message || 'Não foi possível criar a tarefa.');
  }
});

$('#search-input').addEventListener('input', e => {
  state.search = e.target.value;
  renderTasks(visibleTasks());
});

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); openModal(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#search-input').focus(); }
  if (e.key === 'Escape') closeModal();
});

load();
