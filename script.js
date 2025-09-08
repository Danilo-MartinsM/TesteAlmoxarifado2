// =====================
// Funções globais úteis
// =====================

// Mostrar mensagens (toast)
function showToast(mensagem, tipo = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.innerText = mensagem;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 100);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Carregar categorias em qualquer select
async function carregarCategoriasSelect(selectElement, textoTodas = "Todas as Categorias", valorSelecionado = null) {
  try {
    const response = await fetch("http://localhost:8001/categorias");
    const categorias = await response.json();

    // Limpa as opções
    selectElement.innerHTML = "";

    if (textoTodas) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = textoTodas;
      selectElement.appendChild(opt);
    }

    categorias.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.nome;
      if (valorSelecionado && valorSelecionado == cat.id) {
        opt.selected = true;
      }
      selectElement.appendChild(opt);
    });

    // Ativa Select2 só uma vez
    if (!$(selectElement).data("select2")) {
      $(selectElement).select2({
        width: "resolve",
        placeholder: textoTodas,
        allowClear: true
      });
    } else {
      $(selectElement).trigger("change.select2"); // atualiza se já existir
    }
  } catch (err) {
    console.error("Erro ao carregar categorias:", err);
    showToast("Erro ao carregar categorias", "error");
  }
}

// ==========================
// Login
// ==========================
if (document.getElementById("form-login")) {
  document.getElementById("form-login").addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    try {
      const response = await fetch("http://localhost:8001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha })
      });

      if (response.ok) {
        showToast("Login realizado com sucesso", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1000);
      } else {
        showToast("Email ou senha incorretos", "error");
      }
    } catch (err) {
      console.error("Erro no login:", err);
      showToast("Erro no servidor", "error");
    }
  });
}

// ==========================
// Cadastro de produto
// ==========================
if (document.getElementById("form-cadastro")) {
  const selectCategoria = document.getElementById("categoria");
  carregarCategoriasSelect(selectCategoria, "Selecione uma categoria");

  document.getElementById("form-cadastro").addEventListener("submit", async e => {
    e.preventDefault();
    const nome = document.getElementById("nome").value;
    const categoria = document.getElementById("categoria").value;
    const quantidade_inicial = document.getElementById("quantidade").value;

    try {
      const response = await fetch("http://localhost:8001/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, categoria_id: categoria, quantidade_inicial })
      });

      if (response.ok) {
        showToast("Produto cadastrado com sucesso!", "success");
        document.getElementById("form-cadastro").reset();
        $(selectCategoria).val("").trigger("change");
      } else {
        showToast("Erro ao cadastrar produto", "error");
      }
    } catch (err) {
      console.error("Erro:", err);
      showToast("Erro no servidor", "error");
    }
  });
}

// ==========================
// Estoque (listagem e edição)
// ==========================
async function carregarProdutos(filtros = {}) {
  try {
    let url = "http://localhost:8001/produtos?";
    if (filtros.categoria) url += `categoria_id=${filtros.categoria}&`;
    if (filtros.busca) url += `busca=${filtros.busca}&`;

    const response = await fetch(url);
    const produtos = await response.json();

    const tabela = document.querySelector("#tabela-produtos tbody");
    tabela.innerHTML = "";

    produtos.forEach(prod => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${prod.id}</td>
        <td>${prod.nome}</td>
        <td>${prod.categoria}</td>
        <td>${prod.quantidade_inicial}</td>
        <td>${new Date(prod.ultima_alteracao).toLocaleDateString("pt-BR")}</td>
        <td>
          <button onclick="abrirEditarModal(${prod.id})" class="btn btn-edit">Editar</button>
          <button onclick="confirmarExclusaoProduto(${prod.id})" class="btn btn-delete">Excluir</button>
        </td>
      `;
      tabela.appendChild(tr);
    });
  } catch (err) {
    console.error("Erro ao carregar produtos:", err);
    showToast("Erro ao carregar produtos", "error");
  }
}

// Abrir modal de edição
async function abrirEditarModal(idProduto) {
  try {
    const response = await fetch(`http://localhost:8001/produtos/${idProduto}`);
    const produto = await response.json();

    document.getElementById("editar-id").value = produto.id;
    document.getElementById("editar-nome").value = produto.nome;

    const selectEditar = document.getElementById("editar-categoria");
    await carregarCategoriasSelect(selectEditar, "Selecione uma categoria", produto.categoria_id);

    document.getElementById("editar-quantidade").value = produto.quantidade_inicial;

    document.getElementById("modal-editar-produto").style.display = "block";
  } catch (err) {
    console.error("Erro ao abrir modal de edição:", err);
    showToast("Erro ao abrir produto", "error");
  }
}

// Confirmar exclusão (abrir modal)
function confirmarExclusaoProduto(idProduto) {
  const modal = document.getElementById("modalConfirmacaoExclusao");
  modal.style.display = "block";

  document.getElementById("btnConfirmarExclusao").onclick = async () => {
    try {
      const resp = await fetch(`http://localhost:8001/produtos/${idProduto}`, { method: "DELETE" });
      if (resp.ok) {
        showToast("Produto excluído com sucesso", "success");
        carregarProdutos();
      } else {
        showToast("Erro ao excluir produto", "error");
      }
    } catch (err) {
      console.error("Erro ao excluir produto:", err);
      showToast("Erro ao excluir produto", "error");
    }
    modal.style.display = "none";
  };
}

// Fechar modal de exclusão
function fecharModalExclusao() {
  document.getElementById("modalConfirmacaoExclusao").style.display = "none";
}

// ==========================
// Entradas
// ==========================
if (window.location.pathname.includes("cadastrarEntradas.html")) {
  const selectProduto = document.getElementById("produtoEntrada");
  carregarCategoriasSelect(document.getElementById("categoriaEntrada"), "Todas as Categorias");
  carregarProdutosSelect(selectProduto);

  document.getElementById("form-entrada").addEventListener("submit", async e => {
    e.preventDefault();
    const produto_id = selectProduto.value;
    const quantidade = document.getElementById("quantidadeEntrada").value;

    try {
      const response = await fetch("http://localhost:8001/entradas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto_id, quantidade })
      });

      if (response.ok) {
        showToast("Entrada registrada com sucesso!", "success");
        document.getElementById("form-entrada").reset();
        $(selectProduto).val("").trigger("change");
      } else {
        showToast("Erro ao registrar entrada", "error");
      }
    } catch (err) {
      console.error("Erro ao registrar entrada:", err);
      showToast("Erro no servidor", "error");
    }
  });
}

// ==========================
// Saídas
// ==========================
if (window.location.pathname.includes("cadastrarSaidas.html")) {
  const selectProduto = document.getElementById("produtoSaida");
  carregarProdutosSelect(selectProduto);

  document.getElementById("form-saida").addEventListener("submit", async e => {
    e.preventDefault();
    const produto_id = selectProduto.value;
    const quantidade = document.getElementById("quantidadeSaida").value;

    try {
      const response = await fetch("http://localhost:8001/saidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto_id, quantidade })
      });

      if (response.ok) {
        showToast("Saída registrada com sucesso!", "success");
        document.getElementById("form-saida").reset();
        $(selectProduto).val("").trigger("change");
      } else {
        showToast("Erro ao registrar saída", "error");
      }
    } catch (err) {
      console.error("Erro ao registrar saída:", err);
      showToast("Erro no servidor", "error");
    }
  });
}

// ==========================
// Relatórios (novo relatório)
// ==========================
if (document.getElementById("btn-novo-relatorio")) {
  document.getElementById("btn-novo-relatorio").addEventListener("click", () => {
    document.getElementById("modal-novo-relatorio").style.display = "block";
  });

  document.getElementById("form-novo-relatorio").addEventListener("submit", async e => {
    e.preventDefault();
    const titulo = document.getElementById("relatorio-titulo").value;
    const descricao = document.getElementById("relatorio-descricao").value;
    const data = document.getElementById("relatorio-data").value;

    try {
      const response = await fetch("http://localhost:8001/relatorios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, descricao, data })
      });

      if (response.ok) {
        showToast("Relatório criado com sucesso!", "success");
        document.getElementById("form-novo-relatorio").reset();
        document.getElementById("modal-novo-relatorio").style.display = "none";
      } else {
        showToast("Erro ao criar relatório", "error");
      }
    } catch (err) {
      console.error("Erro:", err);
      showToast("Erro no servidor", "error");
    }
  });
}

// ==========================
// Inicialização global
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  // Carregar categorias nos filtros
  document.querySelectorAll('select[id^="filtroCategoria"]').forEach(select => {
    carregarCategoriasSelect(select, "Todas as Categorias");
  });

  // Estoque
  if (document.getElementById("tabela-produtos")) {
    carregarProdutos();

    document.getElementById("filtroProduto")?.addEventListener("input", e => {
      carregarProdutos({ busca: e.target.value, categoria: document.getElementById("filtroCategoria")?.value });
    });

    document.getElementById("filtroCategoria")?.addEventListener("change", e => {
      carregarProdutos({ categoria: e.target.value, busca: document.getElementById("filtroProduto")?.value });
    });
  }
});
