const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

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

app.get('/todos', (req, res) => {
	res.json(todos);
});

app.post('/todos', (req, res) => {
	if (typeof req.body.title !== 'string' || !req.body.title.trim()) {
		return res.status(400).json({erro: "Titulo e obrigatorio."});
	}

	const novaTarefa = {
		'id': nextId++,
		'title': req.body.title.trim(),
		'completed': false
	};

	todos.push(novaTarefa);

	res.status(201).json(novaTarefa);
});

app.patch('/todos/:id/toggle', (req, res) => {
	const id = Number(req.params.id);
	const tarefa = todos.find(t => t.id === id);

	if (!tarefa) {
		return res.status(404).json({erro: "Essa tarefa nao existe"})
	}

	tarefa.completed = !tarefa.completed;
	res.json(tarefa);
});

app.delete('/todos/:id', (req, res) => {
	const id = Number(req.params.id);
	const pos = todos.findIndex(t => t.id === id);

	if (pos === -1) {
		return res.status(404).json({erro: "Essa tarefa nao existe"})
	}

	todos.splice(pos, 1);
	res.status(204).end()
})

app.get('/health', (req, res) => {
	res.json({ status: "ok" });
});

app.listen(4000);
