defmodule TodoApi.MixProject do
  use Mix.Project

  def project do
    [
      app: :todo_api,
      version: "0.1.0",
      elixir: "~> 1.14",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  # Ao rodar `mix run --no-halt`, o Elixir inicia TodoApi.Application,
  # que liga o servidor HTTP e o processo que guarda o estado atual.
  def application do
    [
      extra_applications: [:logger],
      mod: {TodoApi.Application, []}
    ]
  end

  # Dependências (equivalente ao package.json do backend em JS):
  # plug_cowboy -> servidor HTTP + roteamento (papel do Express)
  # jason       -> converter mapas Elixir para JSON e vice-versa
  # cors_plug   -> liberar o navegador a chamar a API de outra porta (papel do cors)
  defp deps do
    [
      {:plug_cowboy, "~> 2.7"},
      {:jason, "~> 1.4"},
      {:cors_plug, "~> 3.0"}
    ]
  end
end
