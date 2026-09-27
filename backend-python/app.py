import os
import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS
from usuarios import RepositorioDeUsuarios

CAMINHO_BANCO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dados.db")

app = Flask(__name__)
CORS(app)


class Tarefa:
    """Uma tarefa. O estado (title, completed) fica escondido atrás de
    properties e só muda através do método toggle() — ninguém de fora
    faz `tarefa.completed = True` diretamente."""

    def __init__(self, id, title, usuario_id, completed=False):
        self.id = id
        self._title = title.strip()
        self._completed = completed
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
    """Dono da coleção de tarefas — agora persistida em SQLite, não mais
    numa lista em memória. Ninguém de fora escreve SQL diretamente, só por
    meio destes métodos, que garantem as regras (título obrigatório, tarefa
    pertencer ao usuário certo antes de mutar)."""

    def __init__(self, caminho_banco=CAMINHO_BANCO):
        self._conexao = sqlite3.connect(caminho_banco, check_same_thread=False)
        self._conexao.execute("""
            CREATE TABLE IF NOT EXISTS tarefas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                usuario_id INTEGER NOT NULL
            )
        """)
        self._conexao.commit()

    def _tarefa_da_linha(self, linha):
        return Tarefa(linha[0], linha[1], linha[3], completed=bool(linha[2]))

    def listar(self, usuario_id):
        linhas = self._conexao.execute(
            "SELECT id, title, completed, usuario_id FROM tarefas WHERE usuario_id = ?",
            (usuario_id,),
        ).fetchall()
        return [self._tarefa_da_linha(l).to_dict() for l in linhas]

    def criar(self, title, usuario_id):
        if not isinstance(title, str) or not title.strip():
            raise ValueError("Titulo e obrigatorio.")
        titulo_limpo = title.strip()
        cursor = self._conexao.execute(
            "INSERT INTO tarefas (title, completed, usuario_id) VALUES (?, 0, ?)",
            (titulo_limpo, usuario_id),
        )
        self._conexao.commit()
        return Tarefa(cursor.lastrowid, titulo_limpo, usuario_id)

    def buscar(self, id, usuario_id):
        linha = self._conexao.execute(
            "SELECT id, title, completed, usuario_id FROM tarefas WHERE id = ? AND usuario_id = ?",
            (id, usuario_id),
        ).fetchone()
        if linha is None:
            return None
        return self._tarefa_da_linha(linha)

    def salvar(self, tarefa):
        """Grava no banco uma mudança feita no objeto (ex: depois de
        toggle()). Sem isso, a mutação existiria só na memória do processo
        atual, exatamente o bug que causou o sumiço das tarefas."""
        self._conexao.execute(
            "UPDATE tarefas SET completed = ? WHERE id = ?",
            (int(tarefa.completed), tarefa.id),
        )
        self._conexao.commit()

    def remover(self, id, usuario_id):
        tarefa = self.buscar(id, usuario_id)
        if tarefa is None:
            return False
        self._conexao.execute("DELETE FROM tarefas WHERE id = ?", (id,))
        self._conexao.commit()
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
    repositorio.salvar(tarefa)
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