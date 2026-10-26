defmodule TodoApi.Application do
  @moduledoc """
  Ponto de partida. Liga, sob um supervisor, os dois processos do backend:
  o que guarda a versão atual do estado e o servidor HTTP.
  Se um deles cair, o supervisor reinicia só ele.
  """
  use Application

  @impl true
  def start(_tipo, _argumentos) do
    # Na nuvem, a plataforma informa a porta pela variável PORT.
    # Localmente, usa 4001 (o backend JS já usa a 4000).
    porta = String.to_integer(System.get_env("PORT", "4001"))

    filhos = [
      TodoApi.Estado,
      {Plug.Cowboy, scheme: :http, plug: TodoApi.Router, options: [port: porta]}
    ]

    Supervisor.start_link(filhos, strategy: :one_for_one, name: TodoApi.Supervisor)
  end
end
