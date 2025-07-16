// --- Variáveis globais ---
let ordemAtual = {
  coluna: "id",
  direcao: "asc"
};

// --- Funções auxiliares ---

// Carrega categorias em um select, com texto padrão personalizável (SEM Select2)
function carregarCategoriasSelect(selectElement, textoPadrao = "Selecione uma categoria") {
  fetch("http://localhost:8000/categorias")
    .then(res => res.json())
    .then(data => {
      selectElement.innerHTML = `<option value="">${textoPadrao}</option>`;
      data.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = cat.nome;
        selectElement.appendChild(option);
      });
      // NÃO aplica select2 aqui para categorias
    })
    .catch(() => {
      selectElement.innerHTML = `<option value="">Erro ao carregar categorias</option>`;
    });
}

// Carrega produtos em um select COM Select2
function carregarProdutosSelect(selectElement, textoPadrao = "Todos os Produtos") {
  fetch("http://localhost:8000/produtos")
    .then(res => res.json())
    .then(data => {
      selectElement.innerHTML = `<option value="">${textoPadrao}</option>`;
      data.forEach(prod => {
        const option = document.createElement("option");
        option.value = prod.id;
        option.textContent = prod.nome;
        selectElement.appendChild(option);
      });

      // Aplica Select2 só aqui
      $(selectElement).select2({
        placeholder: textoPadrao,
        allowClear: true,
        width: '100%'
      });
    })
    .catch(() => {
      selectElement.innerHTML = `<option value="">Erro ao carregar produtos</option>`;
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
        window.location.href = "dashboard2.html";
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

    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');

    const dataLocal = `${ano}-${mes}-${dia}T${horas}:${minutos}`;
    dataInput.value = dataLocal;
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
    const selectCadastro = document.getElementById("categoria");
    const selectFiltro = document.getElementById("filtro-categoria");

    if (selectCadastro) carregarCategoriasSelect(selectCadastro);
    if (selectFiltro) carregarCategoriasSelect(selectFiltro, "Todas as Categorias");
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
    if (selectEditar) carregarCategoriasSelect(selectEditar);

    fetch("http://localhost:8000/categorias")
      .then(res => res.json())
      .then(categorias => {
        // Depois de carregar as categorias, seleciona a correta
        const options = selectEditar.options;
        for (let i = 0; i < options.length; i++) {
          if (options[i].value == id_categoria) {
            options[i].selected = true;
            break;
          }
        }
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
        alert(data.mensagem);
        fecharModal();
        carregarProdutos();
      })
      .catch(err => {
        console.error("Erro ao editar produto:", err);
        alert("Erro ao editar produto");
      });
  });

  function excluirProduto(id) {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    fetch(`http://localhost:8000/produtos/${id}`, {
      method: "DELETE"
    })
      .then(res => res.json())
      .then(data => {
        alert(data.mensagem);
        carregarProdutos();
      })
      .catch(err => {
        console.error("Erro ao excluir produto:", err);
        alert("Erro ao excluir produto");
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

  // Preenche os filtros
  if (filtroCategoria) {
    carregarCategoriasSelect(filtroCategoria, "Todas as Categorias");
  }
  if (filtroProduto) {
    carregarProdutosSelect(filtroProduto, "Todos os Produtos");
  }

  // Inicializa Select2 no filtroProduto (após carregar produtos)
  // Obs: Já chamado dentro carregarProdutosSelect, pode remover o $(document).ready desnecessário

  // Define data de hoje no formato yyyy-mm-dd com zeros à esquerda
  const hojeDate = new Date();
  const hoje = hojeDate.getFullYear() + '-' +
               String(hojeDate.getMonth() + 1).padStart(2, '0') + '-' +
               String(hojeDate.getDate()).padStart(2, '0');

  const eventosHoje = [{
    title: 'Hoje',
    date: hoje,
    display: 'background',
    backgroundColor: '#ffeaa7'
  }];

  function buscarEventosFiltrados() {
    // Verifica se os filtros existem antes de acessar value
    const produtoSelecionado = filtroProduto ? $(filtroProduto).val() : "";
    const categoriaSelecionada = filtroCategoria ? filtroCategoria.value : "";

    const eventos = [];

    if (produtoSelecionado) {
      eventos.push({
        title: `Eventos do produto ${produtoSelecionado}`,
        date: hoje,
        backgroundColor: '#74b9ff'
      });
    }

    if (categoriaSelecionada) {
      eventos.push({
        title: `Eventos da categoria ${categoriaSelecionada}`,
        date: hoje,
        backgroundColor: '#55efc4'
      });
    }

    if (!produtoSelecionado && !categoriaSelecionada) {
      eventos.push(...eventosHoje);
    }

    return eventos;
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'pt-br',
    events: [...eventosHoje],
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

  dataAtualEl.textContent = 'Hoje: ' + hojeDate.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  // Atualiza eventos no calendário e lista de movimentações quando filtros mudam
  if (filtroProduto) {
    $(filtroProduto).on('change', () => {
      calendar.removeAllEvents();
      const eventosFiltrados = buscarEventosFiltrados();
      calendar.addEventSource(eventosFiltrados);

      carregarMovimentacoes();
    });
  }

  if (filtroCategoria) {
    filtroCategoria.addEventListener('change', () => {
      calendar.removeAllEvents();
      const eventosFiltrados = buscarEventosFiltrados();
      calendar.addEventSource(eventosFiltrados);

      carregarMovimentacoes();
    });
  }

  // Inicializa movimentações ao carregar calendário
  carregarMovimentacoes();
}

// --- MOVIMENTAÇÕES ---

function carregarMovimentacoes() {
  const container = document.querySelector(".movimentacao-list");
  if (!container) {
    console.log("Container não encontrado");
    return;
  }

  const filtroProduto = document.getElementById('filtroProduto');
  const filtroCategoria = document.getElementById('filtroCategoria');

  // Lê os valores dos filtros
  const produtoSelecionado = filtroProduto ? $(filtroProduto).val() : "";

  const categoriaSelecionada = filtroCategoria ? filtroCategoria.value : "";

  // Monta query string com filtros
  let url = "http://localhost:8000/movimentacoes?";
  if (produtoSelecionado) url += `produto_id=${encodeURIComponent(produtoSelecionado)}&`;
  if (categoriaSelecionada) url += `categoria_id=${encodeURIComponent(categoriaSelecionada)}&`;

  fetch(url)
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

// --- TOASTS ---

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.classList.add("toast", type);
  toast.textContent = message;

  container.appendChild(toast);
  carregarMovimentacoes();

  // Remove o toast depois de 3 segundos
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

if (document.querySelector(".movimentacao-list")) {
  carregarMovimentacoes();
}


// --- CADASTRAR ENTRADAS ---
if (window.location.pathname.includes("cadastrarEntradas.html")) {
  const filtroProduto = document.getElementById("filtroProduto");
  const formEntrada = document.querySelector("form");
  const dataInput = document.getElementById("dataAlteracao");

  // <div id="mensagem" style="display:none; margin-top:10px; font-weight:bold;"></div>
  const mensagem = document.getElementById("mensagem");

  // Função para mostrar mensagens
  function mostrarMensagem(texto, tipo = "erro") {
    if (!mensagem) return;
    mensagem.textContent = texto;
    mensagem.className = tipo; // "erro" ou "sucesso"
    mensagem.style.display = "block";

    setTimeout(() => {
      mensagem.style.display = "none";
    }, 4000);
  }

  // Atualiza campo data/hora para horário atual formatado
  function atualizarDataAtual() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    if (dataInput) dataInput.value = `${ano}-${mes}-${dia}T${horas}:${minutos}`;
  }

  // Carrega os produtos no select com Select2
  if (filtroProduto) {
    carregarProdutosSelect(filtroProduto, "Selecione um produto");
  }

  if (dataInput) {
    atualizarDataAtual();
  }

  if (formEntrada) {
    formEntrada.addEventListener("submit", async (e) => {
      e.preventDefault();

      const id_produto = filtroProduto?.value;
      const quantidadeStr = document.getElementById("quantidadeEntrada")?.value;
      const data_alteracao = dataInput?.value;

      // Validações
      if (!id_produto) {
        mostrarMensagem("Por favor, selecione um produto.", "erro");
        return;
      }

      const quantidade = Number(quantidadeStr);
      if (!quantidade || quantidade <= 0 || !Number.isInteger(quantidade)) {
        mostrarMensagem("Informe uma quantidade válida (inteiro maior que zero).", "erro");
        return;
      }

      if (!data_alteracao) {
        mostrarMensagem("Informe a data da entrada.", "erro");
        return;
      }

      const formData = new FormData();
      formData.append("id_produto", id_produto);
      formData.append("quantidade", quantidade);
      formData.append("data_alteracao", data_alteracao);

      try {
        const response = await fetch("http://localhost:8000/entradas", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          mostrarMensagem(result.mensagem || "Entrada registrada com sucesso.", "sucesso");
          formEntrada.reset();
          atualizarDataAtual();
        } else {
          mostrarMensagem(result.detail || "Erro ao registrar entrada.", "erro");
        }
      } catch (error) {
        console.error("Erro ao enviar entrada:", error);
        mostrarMensagem("Erro ao conectar com o servidor.", "erro");
      }
    });
  }
}







// --- CADASTRAR SAÍDAS ---
if (window.location.pathname.includes("cadastrarSaidas.html")) {
  const filtroProdutoSaida = document.getElementById("filtroProdutoSaida");
  const formSaida = document.querySelector("form");
  const dataInput = document.getElementById("dataSaida");

  // Crie um container para mensagens, ou adicione no HTML:
  // <div id="mensagem" style="display:none; margin-top:10px; font-weight:bold;"></div>
  const mensagem = document.getElementById("mensagem");

  // Função para mostrar mensagens
  function mostrarMensagem(texto, tipo = "erro") {
    if (!mensagem) return;
    mensagem.textContent = texto;
    mensagem.className = tipo; // "erro" ou "sucesso"
    mensagem.style.display = "block";

    setTimeout(() => {
      mensagem.style.display = "none";
    }, 4000);
  }

  // Atualiza campo data/hora para horário atual formatado
  function atualizarDataAtual() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    if (dataInput) dataInput.value = `${ano}-${mes}-${dia}T${horas}:${minutos}`;
  }

  // Carrega os produtos no select com Select2
  if (filtroProdutoSaida) {
    carregarProdutosSelect(filtroProdutoSaida, "Selecione um produto");
  }

  if (dataInput) {
    atualizarDataAtual();
  }

  if (formSaida) {
    formSaida.addEventListener("submit", async (e) => {
      e.preventDefault();

      const id_produto = filtroProdutoSaida?.value;
      const quantidadeStr = document.getElementById("quantidadeSaida")?.value;
      const data_alteracao = dataInput?.value;

      // Validações
      if (!id_produto) {
        mostrarMensagem("Por favor, selecione um produto.", "erro");
        return;
      }

      const quantidade = Number(quantidadeStr);
      if (!quantidade || quantidade <= 0 || !Number.isInteger(quantidade)) {
        mostrarMensagem("Informe uma quantidade válida (inteiro maior que zero).", "erro");
        return;
      }

      if (!data_alteracao) {
        mostrarMensagem("Informe a data da saída.", "erro");
        return;
      }

      const formData = new FormData();
      formData.append("id_produto", id_produto);
      formData.append("quantidade", quantidade);
      formData.append("data_alteracao", data_alteracao);

      try {
        const response = await fetch("http://localhost:8000/saidas", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          mostrarMensagem(result.mensagem || "Saída registrada com sucesso.", "sucesso");
          formSaida.reset();
          atualizarDataAtual();
        } else {
          mostrarMensagem(result.detail || "Erro ao registrar saída.", "erro");
        }
      } catch (error) {
        console.error("Erro ao enviar saída:", error);
        mostrarMensagem("Erro ao conectar com o servidor.", "erro");
      }
    });
  }
}








