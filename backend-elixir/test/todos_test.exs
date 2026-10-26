defmodule TodoApi.TodosTest do
  # Testes do núcleo funcional. Não sobem servidor nenhum: como as funções
  # são puras, basta chamar e comparar valores.
  # Cada teste confere DUAS coisas: o resultado novo E que o valor que
  # entrou continua igual (preservação).
  use ExUnit.Case, async: true

  alias TodoApi.Todos

  setup do
    {:ok, antes: Todos.estado_inicial()}
  end

  test "criar devolve uma nova versão e preserva a original", %{antes: antes} do
    {:ok, tarefa, depois} = Todos.criar(antes, "  Estudar Elixir  ")

    assert tarefa == %{id: 4, title: "Estudar Elixir", completed: false}
    assert hd(Todos.listar(depois)) == tarefa
    assert length(Todos.listar(depois)) == 4

    assert length(Todos.listar(antes)) == 3
    assert antes == Todos.estado_inicial()
  end

  test "título vazio, só espaços ou que não é texto é recusado", %{antes: antes} do
    for invalido <- ["", "   ", nil, 42, true, ["oi"]] do
      assert Todos.criar(antes, invalido) == {:error, :titulo_invalido}
    end
  end

  test "alternar muda só a tarefa pedida e preserva a original", %{antes: antes} do
    {:ok, tarefa, depois} = Todos.alternar(antes, 3)

    assert tarefa.completed == true
    assert Todos.buscar(depois, 3).completed == true
    assert Todos.buscar(depois, 1) == Todos.buscar(antes, 1)

    assert Todos.buscar(antes, 3).completed == false
  end

  test "alternar duas vezes volta exatamente ao estado de partida", %{antes: antes} do
    {:ok, _, uma_vez} = Todos.alternar(antes, 3)
    {:ok, _, duas_vezes} = Todos.alternar(uma_vez, 3)

    assert duas_vezes == antes
  end

  test "remover devolve uma nova versão sem a tarefa e preserva a original", %{antes: antes} do
    {:ok, removida, depois} = Todos.remover(antes, 1)

    assert removida.id == 1
    assert Todos.buscar(depois, 1) == nil
    assert length(Todos.listar(depois)) == 2

    assert Todos.buscar(antes, 1) != nil
    assert length(Todos.listar(antes)) == 3
  end

  test "id inexistente vira um erro explícito, com o id que faltou", %{antes: antes} do
    assert Todos.alternar(antes, 99) == {:error, {:nao_encontrada, 99}}
    assert Todos.remover(antes, 99) == {:error, {:nao_encontrada, 99}}
  end

  test "um id removido não é reaproveitado", %{antes: antes} do
    {:ok, _, sem_a_tres} = Todos.remover(antes, 3)
    {:ok, nova, _} = Todos.criar(sem_a_tres, "Nova")

    assert nova.id == 4
  end
end
