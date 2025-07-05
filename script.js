// --- Variáveis globais ---
let ordemAtual = {
  coluna: "id",
  direcao: "asc"
};

// --- Funções auxiliares ---

// Carrega categorias em um select
function carregarCategoriasSelect(selectElement) {
  fetch("http://localhost:8000/categorias")
    .then(res => res.json())
    .then(data => {
      selectElement.innerHTML = '<option value="">Selecione uma categoria</option>';
      data.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = cat.nome;
        selectElement.appendChild(option);
      });
    })
    .catch(() => {
      selectElement.innerHTML = '<option value="">Erro ao carregar categorias</option>';
    });
}

// --- LOGIN ---
if (document.getElementById("login-form")) {
  const form = document.getElementById("login-form");
  const mensagem = document.getElementById("mensagem");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);

    try {
      const response = await fetch("http://localhost:8000/login", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        mensagem.textContent = errorData.detail || "Erro no login.";
        mensagem.classList.remove("sucesso");
        mensagem.classList.add("erro");
        return;
      }

      const data = await response.json();
      mensagem.textContent = data.mensagem;
      mensagem.classList.remove("erro");
      mensagem.classList.add("sucesso");

      setTimeout(() => {
        window.location.href = "estoque.html";
      }, 1000);
    } catch (error) {
      mensagem.textContent = "Erro na conexão.";
      mensagem.classList.remove("sucesso");
      mensagem.classList.add("erro");
      console.error("Erro no fetch:", error);
    }
  });
}

// --- CADASTRO DE PRODUTO ---
if (document.getElementById("form-cadastro")) {
  const form = document.getElementById("form-cadastro");
  const categoriaSelect = document.getElementById("categoriaProduto");
  const mensagem = document.getElementById("mensagem");

  // Preenche o campo dataAlteracao com a data atual no formato correto
  const dataInput = document.getElementById("dataAlteracao");
  if (dataInput) {
    const agora = new Date();
    const localISO = agora.toISOString().slice(0, 16);
    dataInput.value = localISO;
  }

  if (categoriaSelect) carregarCategoriasSelect(categoriaSelect);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("nome", form.nomeProduto.value);
    formData.append("id_categoria", form.categoriaProduto.value);
    formData.append("data_alteracao", form.dataAlteracao.value);
    formData.append("quantidade_inicial", form.quantidadeInicial.value);

    try {
      const response = await fetch("http://localhost:8000/produtos", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        mensagem.textContent = data.mensagem;
        mensagem.style.color = "green";
        form.reset();
      } else {
        mensagem.textContent = data.detail || "Erro ao cadastrar.";
        mensagem.style.color = "red";
      }
    } catch (err) {
      mensagem.textContent = "Erro ao conectar com o servidor.";
      mensagem.style.color = "red";
    }
  });
}

// --- PÁGINA DE ESTOQUE ---
if (document.getElementById("tabela-produtos")) {

  function carregarCategorias() {
    fetch("http://localhost:8000/categorias")
      .then(res => res.json())
      .then(data => {
        const selectCadastro = document.getElementById("categoria");
        const selectFiltro = document.getElementById("filtro-categoria");

        if (selectCadastro) {
          selectCadastro.innerHTML = "";
          data.forEach(cat => {
            const optionCadastro = document.createElement("option");
            optionCadastro.value = cat.id;
            optionCadastro.textContent = cat.nome;
            selectCadastro.appendChild(optionCadastro);
          });
        }

        if (selectFiltro) {
          selectFiltro.innerHTML = '<option value="">Todas as Categorias</option>';
          data.forEach(cat => {
            const optionFiltro = document.createElement("option");
            optionFiltro.value = cat.id;
            optionFiltro.textContent = cat.nome;
            selectFiltro.appendChild(optionFiltro);
          });
        }
      })
      .catch(err => console.error("Erro ao carregar categorias", err));
  }

  function carregarProdutos() {
    const busca = document.getElementById("busca")?.value || "";
    const categoria = document.getElementById("filtro-categoria").value;
    const dataFiltro = document.getElementById("filtro-data").value;

    let url = `http://localhost:8000/produtos?order_by=${ordemAtual.coluna}&order_dir=${ordemAtual.direcao}&busca=${encodeURIComponent(busca)}`;

    if (categoria) url += `&categoria_id=${categoria}`;
    if (dataFiltro) url += `&data=${encodeURIComponent(dataFiltro)}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        const tbody = document.querySelector("#tabela-produtos tbody");
        tbody.innerHTML = "";

        data.forEach(produto => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${produto.id}</td>
            <td>${produto.nome}</td>
            <td>${produto.categoria || "Sem categoria"}</td>
            <td>${produto.quantidade_inicial}</td>
            <td>${produto.ultima_alteracao ? new Date(produto.ultima_alteracao).toLocaleString("pt-BR") : '—'}</td>
            <td>
              <button onclick="abrirEditarModal(${produto.id}, '${produto.nome}', '${produto.id_categoria || ''}')">Editar</button>
              <button onclick="excluirProduto(${produto.id})">Excluir</button>
            </td>
          `;
          tbody.appendChild(tr);
        });
      })
      .catch(err => console.error("Erro ao carregar produtos", err));
  }

  function configurarOrdenacao() {
    const headers = document.querySelectorAll("#tabela-produtos thead th");
    headers.forEach(th => {
      th.style.cursor = "pointer";
      th.addEventListener("click", () => {
        const coluna = th.getAttribute("data-coluna");
        if (!coluna) return;

        if (ordemAtual.coluna === coluna) {
          ordemAtual.direcao = ordemAtual.direcao === "asc" ? "desc" : "asc";
        } else {
          ordemAtual.coluna = coluna;
          ordemAtual.direcao = "asc";
        }
        carregarProdutos();
      });
    });
  }

  // Modal editar produto
  function abrirEditarModal(id, nome, id_categoria) {
    document.getElementById("editar-id").value = id;
    document.getElementById("editar-nome").value = nome;

    const selectEditar = document.getElementById("editar-categoria");

    fetch("http://localhost:8000/categorias")
      .then(res => res.json())
      .then(categorias => {
        selectEditar.innerHTML = "";
        categorias.forEach(cat => {
          const option = document.createElement("option");
          option.value = cat.id;
          option.textContent = cat.nome;
          if (cat.id == id_categoria) option.selected = true;
          selectEditar.appendChild(option);
        });
        document.getElementById("modal-editar").style.display = "flex";
      });
  }

  function fecharModal() {
    document.getElementById("modal-editar").style.display = "none";
  }

  document.getElementById("form-editar").addEventListener("submit", function (e) {
    e.preventDefault();

    const id = document.getElementById("editar-id").value;
    const nome = document.getElementById("editar-nome").value;
    const id_categoria = document.getElementById("editar-categoria").value;

    const formData = new FormData();
    formData.append("nome", nome);
    formData.append("id_categoria", id_categoria);

    fetch(`http://localhost:8000/produtos/${id}`, {
      method: "PUT",
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        showToast(data.mensagem, "success");
        fecharModal();
        carregarProdutos();
      })
      .catch(err => {
        console.error("Erro ao editar produto:", err);
        showToast("Erro ao editar produto", "error");
      });
  });

  function excluirProduto(id) {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    fetch(`http://localhost:8000/produtos/${id}`, {
      method: "DELETE"
    })
      .then(res => res.json())
      .then(data => {
        showToast(data.mensagem, "success");
        carregarProdutos();
      })
      .catch(err => {
        console.error("Erro ao excluir produto:", err);
        showToast("Erro ao excluir produto", "error");
      });
  }

  // Inicialização da página de estoque
  window.onload = function () {
    carregarCategorias();
    configurarOrdenacao();
    carregarProdutos();
  };
}

// --- CALENDÁRIO (FullCalendar) ---
if (document.getElementById("calendar")) {
  const calendarEl = document.getElementById('calendar');
  const dataAtualEl = document.getElementById('data-atual');
  const filtroProduto = document.getElementById('filtroProduto');
  const filtroCategoria = document.getElementById('filtroCategoria');

  const hoje = new Date().toISOString().split('T')[0];
  const eventosHoje = [{
    title: 'Hoje',
    date: hoje,
    display: 'background',
    backgroundColor: '#ffeaa7'
  }];

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'pt-br',
    events: [...filtrarEventos(), ...eventosHoje], // filtrarEventos deve estar definido em outro lugar
    dateClick: function (info) {
      const selectedDate = info.date.toISOString().split('T')[0];
      if (selectedDate === hoje) {
        dataAtualEl.textContent = 'Hoje: ' + info.date.toLocaleDateString('pt-BR', {
          day: '2-digit', month: 'long', year: 'numeric'
        });
      } else {
        dataAtualEl.textContent = 'Data: ' + info.date.toLocaleDateString('pt-BR', {
          day: '2-digit', month: 'long', year: 'numeric'
        });
      }
      document.querySelectorAll('.fc-day').forEach(day => {
        day.classList.remove('fc-day-selected');
      });

      info.dayEl.classList.add('fc-day-selected');
    }
  });

  calendar.render();

  dataAtualEl.textContent = 'Hoje: ' + new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  [filtroProduto, filtroCategoria].forEach(filtro =>
    filtro.addEventListener('change', () => {
      calendar.removeAllEvents();
      calendar.addEventSource([...filtrarEventos(), ...eventosHoje]);
    })
  );
}

// --- MOVIMENTAÇÕES ---
function carregarMovimentacoes() {
  const container = document.querySelector(".movimentacao-list");
  if (!container) {
    console.log("Container não encontrado");
    return;
  }

  fetch("http://localhost:8000/movimentacoes")
    .then(res => res.json())
    .then(data => {
      console.log("Movimentações:", data);
      container.innerHTML = "";

      data.forEach(mov => {
        const div = document.createElement("div");
        div.classList.add("product-item");
        div.innerHTML = `
          <div class="product-icon">📦</div>
          <div>
            <strong>${mov.produto}</strong><br />
            <small>${mov.tipo} - ${mov.quantidade} unidades</small><br />
            <small>${new Date(mov.data_alteracao).toLocaleString('pt-BR')}</small><br />
          </div>
        `;
        container.appendChild(div);
      });
    })
    .catch(err => {
      console.error("Erro ao carregar movimentações:", err);
    });
}

carregarMovimentacoes();

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.classList.add("toast", type);
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}
