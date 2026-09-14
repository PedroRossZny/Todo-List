// server.js
// -----------------------------------------------------------------------
// Backend em Node/Express: implementa o contrato REST compartilhado da
// disciplina — GET /todos, POST /todos, PATCH /todos/:id/toggle,
// DELETE /todos/:id, GET /health — no paradigma IMPERATIVO (estado mutável
// em memória, controle de fluxo explícito com if/return). O mesmo contrato
// será reimplementado em Elixir (funcional) e Python (orientado a objetos)
// em ciclos futuros da disciplina, para comparar os três paradigmas
// resolvendo exatamente o mesmo problema.
// -----------------------------------------------------------------------
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Decisão imperativa: `nextId` e `todos` são estado mutável, vivo na memória
// do processo e compartilhado por TODAS as requisições — não há cópia por
// request nem estrutura imutável. Cada rota lê e altera esse mesmo estado
// diretamente; é essa mutação compartilhada, e não uma passagem explícita de
// estado entre chamadas, que caracteriza o estilo imperativo aqui.
let nextId = 1;

let todos = [
	{
		'id': nextId++,
		'title': "Primeira tarefa",
		'completed': true
	},

	{
		'id': nextId++,
		'title': "Segunda tarefa",
		'completed': true
	},

	{
		'id': nextId++,
		'title': "Terceira tarefa",
		'completed': false
	}
];

// GET /todos — lista todas as tarefas. Sempre 200, mesmo com a lista vazia.
app.get('/todos', (req, res) => {
	res.json(todos);
});

// POST /todos — cria uma tarefa a partir de {title}. 400 se o título estiver
// ausente, vazio ou só com espaço; 201 com a tarefa criada em caso de sucesso.
app.post('/todos', (req, res) => {
	// Decisão imperativa: a rota é uma sequência de passos com controle de
	// fluxo explícito — validação primeiro, com if + return antecipado
	// cortando o caminho de erro; o que sobra depois do if já é o caminho de
	// sucesso (criação da tarefa, seguida da resposta). O mesmo padrão
	// validação -> mutação -> resposta se repete em PATCH e DELETE, abaixo.
	if (typeof req.body.title !== 'string' || !req.body.title.trim()) {
		return res.status(400).json({erro: "Titulo e obrigatorio."});
	}

	const novaTarefa = {
		'id': nextId++,
		'title': req.body.title.trim(),
		'completed': false
	};

	// Decisão imperativa: muta o array compartilhado diretamente (push) em
	// vez de criar um array novo (ex.: [...todos, novaTarefa]) e substituir a
	// referência. O mesmo padrão se repete em tarefa.completed = ... (PATCH)
	// e todos.splice (DELETE), abaixo: sempre altera a estrutura existente no
	// lugar, nunca gera uma cópia.
	todos.push(novaTarefa);

	res.status(201).json(novaTarefa);
});

// PATCH /todos/:id/toggle — alterna completed da tarefa com esse id. 404 se o
// id não existir; 200 com a tarefa já atualizada em caso de sucesso.
app.patch('/todos/:id/toggle', (req, res) => {
	const id = Number(req.params.id);
	const tarefa = todos.find(t => t.id === id);

	// Decisão imperativa: mesma sequência validação -> mutação -> resposta
	// de POST /todos (se não existir, corta o caminho de erro com return).
	if (!tarefa) {
		return res.status(404).json({erro: "Essa tarefa nao existe"})
	}

	// Decisão imperativa: mutação direta da tarefa existente, no lugar (ver
	// nota completa em todos.push, dentro de POST /todos).
	tarefa.completed = !tarefa.completed;
	res.json(tarefa);
});

// DELETE /todos/:id — remove a tarefa com esse id. 404 se o id não existir;
// 204 sem corpo em caso de sucesso.
app.delete('/todos/:id', (req, res) => {
	const id = Number(req.params.id);
	const pos = todos.findIndex(t => t.id === id);

	// Decisão imperativa: mesma sequência validação -> mutação -> resposta
	// de POST /todos (se não existir, corta o caminho de erro com return).
	if (pos === -1) {
		return res.status(404).json({erro: "Essa tarefa nao existe"})
	}

	// Decisão imperativa: mutação direta do array compartilhado, no lugar
	// (ver nota completa em todos.push, dentro de POST /todos).
	todos.splice(pos, 1);
	res.status(204).end()
})

// GET /health — checagem simples de disponibilidade do backend; sempre 200.
app.get('/health', (req, res) => {
	res.json({ status: "ok" });
});

app.listen(4000);
