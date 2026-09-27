from flask import Flask, request, jsonify
from flask_cors import CORS
from usuarios import RepositorioDeUsuarios

app = Flask(__name__)
CORS(app)


class Tarefa:
    """Uma tarefa. O estado (title, completed) fica escondido atrás de
    properties e só muda através do método toggle() — ninguém de fora
    faz `tarefa.completed = True` diretamente."""

    def __init__(self, id, title, usuario_id):
        self.id = id
        self._title = title.strip()
        self._completed = False
        self.usuario_id = usuario_id

    @property
    def title(self):
        return self._title

    @property
    def completed(self):
        return self._completed

    def toggle(self):
        self._completed = not self._completed

    def to_dict(self):
        return {"id": self.id, "title": self._title, "completed": self._completed, "usuario_id": self.usuario_id}


class RepositorioDeTarefas:
    """Dono da coleção de tarefas. Ninguém de fora mexe numa lista solta —
    só por meio destes métodos, que garantem as regras (título obrigatório,
    id sequencial, tarefa existir antes de mutar)."""

    def __init__(self):
        self._tarefas = []
        self._next_id = 1

    def listar(self, usuario_id):
        return [t.to_dict() for t in self._tarefas if t.usuario_id == usuario_id]

    def criar(self, title, usuario_id):
        if not isinstance(title, str) or not title.strip():
            raise ValueError("Titulo e obrigatorio.")
        tarefa = Tarefa(self._next_id, title, usuario_id)
        self._next_id += 1
        self._tarefas.append(tarefa)
        return tarefa

    def buscar(self, id, usuario_id):
        for t in self._tarefas:
            if t.id == id and t.usuario_id == usuario_id:
                return t
        return None

    def remover(self, id, usuario_id):
        tarefa = self.buscar(id, usuario_id)
        if tarefa is None:
            return False
        self._tarefas.remove(tarefa)
        return True


repositorio = RepositorioDeTarefas()

repositorio_usuarios = RepositorioDeUsuarios()


@app.post("/register")
def registrar():
    dados = request.get_json(silent=True) or {}
    try:
        usuario = repositorio_usuarios.criar(dados.get("username", ""), dados.get("senha", ""))
    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400
    return jsonify(usuario.to_dict()), 201


@app.post("/login")
def login():
    dados = request.get_json(silent=True) or {}
    usuario = repositorio_usuarios.buscar_por_username(dados.get("username", ""))
    if usuario is None or not usuario.verificar_senha(dados.get("senha", "")):
        return jsonify({"erro": "Username ou senha invalidos."}), 401
    return jsonify(usuario.to_dict())


@app.get("/todos")
def listar_todos():
    usuario_id = request.args.get("usuario_id", type=int)
    if usuario_id is None:
        return jsonify({"erro": "usuario_id e obrigatorio"}), 400
    return jsonify(repositorio.listar(usuario_id))


@app.post("/todos")
def criar_todo():
    dados = request.get_json(silent=True) or {}
    usuario_id = dados.get("usuario_id")
    if usuario_id is None:
        return jsonify({"erro": "usuario_id e obrigatorio"}), 400
    try:
        tarefa = repositorio.criar(dados.get("title", ""), usuario_id)
    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400
    return jsonify(tarefa.to_dict()), 201


@app.patch("/todos/<int:id>/toggle")
def toggle_todo(id):
    usuario_id = request.args.get("usuario_id", type=int)
    tarefa = repositorio.buscar(id, usuario_id)
    if tarefa is None:
        return jsonify({"erro": "Essa tarefa nao existe"}), 404
    tarefa.toggle()
    return jsonify(tarefa.to_dict())


@app.delete("/todos/<int:id>")
def remover_todo(id):
    usuario_id = request.args.get("usuario_id", type=int)
    if not repositorio.remover(id, usuario_id):
        return jsonify({"erro": "Essa tarefa nao existe"}), 404
    return "", 204


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(port=5000)
