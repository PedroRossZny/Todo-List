import os
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash

CAMINHO_BANCO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dados.db")


class Usuario:
    """Representa uma conta. A senha nunca fica guardada em texto puro —
    só o hash, em _senha_hash. verificar_senha() compara por dentro,
    sem nunca devolver o hash pra fora."""

    def __init__(self, id, username, senha_hash):
        self.id = id
        self.username = username
        self._senha_hash = senha_hash

    def verificar_senha(self, senha):
        return check_password_hash(self._senha_hash, senha)

    def to_dict(self):
        return {"id": self.id, "username": self.username}


class RepositorioDeUsuarios:
    """Dono da tabela de usuarios no banco. É o único lugar do sistema que
    sabe que existe SQL, e o único que sabe gerar hash de senha."""

    def __init__(self, caminho_banco=CAMINHO_BANCO):
        self._conexao = sqlite3.connect(caminho_banco, check_same_thread=False)
        self._conexao.execute("""
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                senha_hash TEXT NOT NULL
            )
        """)
        self._conexao.commit()

    def criar(self, username, senha):
        username = (username or "").strip()
        if not username:
            raise ValueError("Username e obrigatorio.")
        if not senha or len(senha) < 4:
            raise ValueError("Senha precisa ter pelo menos 4 caracteres.")

        senha_hash = generate_password_hash(senha)
        try:
            cursor = self._conexao.execute(
                "INSERT INTO usuarios (username, senha_hash) VALUES (?, ?)",
                (username, senha_hash),
            )
            self._conexao.commit()
        except sqlite3.IntegrityError:
            raise ValueError("Esse username ja existe.")

        return Usuario(cursor.lastrowid, username, senha_hash)

    def buscar_por_username(self, username):
        linha = self._conexao.execute(
            "SELECT id, username, senha_hash FROM usuarios WHERE username = ?",
            (username,),
        ).fetchone()
        if linha is None:
            return None
        return Usuario(linha[0], linha[1], linha[2])
