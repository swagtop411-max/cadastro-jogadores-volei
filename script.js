/* =========================================================
   CADASTRO DE JOGADORES DE VÔLEI
   Script principal
   ========================================================= */


/* =========================================================
   DADOS
   ========================================================= */

let jogadores = carregarJogadores();
let editIndex = null;


/* =========================================================
   ELEMENTOS DO HTML
   ========================================================= */

const form = document.getElementById("formJogador");
const busca = document.getElementById("busca");
const filtroNivel = document.getElementById("filtroNivel");

const fotoInput = document.getElementById("foto");
const preview = document.getElementById("preview");

const timesContainer = document.getElementById("timesContainer");

const btnSalvar = document.getElementById("btnSalvar");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");

const tituloFormulario = document.getElementById("tituloFormulario");

const listaJogadores = document.getElementById("listaJogadores");
const ranking = document.getElementById("ranking");

const totalElement = document.getElementById("total");
const mediaElement = document.getElementById("media");
const melhorElement = document.getElementById("melhor");


/* =========================================================
   CARREGAR JOGADORES
   ========================================================= */

function carregarJogadores() {

  try {

    const dados = localStorage.getItem("jogadores");

    if (!dados) {
      return [];
    }

    const lista = JSON.parse(dados);

    if (!Array.isArray(lista)) {
      return [];
    }

    return lista.map(jogador => normalizarJogador(jogador));

  } catch (erro) {

    console.error("Erro ao carregar jogadores:", erro);

    return [];
  }
}


/* =========================================================
   NORMALIZAR DADOS
   Mantém compatibilidade com cadastros antigos
   ========================================================= */

function normalizarJogador(jogador) {

  return {

    nome: jogador.nome || "",

    time: jogador.time || "",

    categoria: jogador.categoria || "",

    nivel: jogador.nivel || "Iniciante",

    times: Array.isArray(jogador.times)
      ? jogador.times
      : [],

    foto: jogador.foto || "",

    avaliacoes: Array.isArray(jogador.avaliacoes)
      ? jogador.avaliacoes
          .map(Number)
          .filter(nota => !isNaN(nota))
      : []

  };
}


/* =========================================================
   SALVAR
   ========================================================= */

function salvar() {

  try {

    localStorage.setItem(
      "jogadores",
      JSON.stringify(jogadores)
    );

  } catch (erro) {

    console.error("Erro ao salvar jogadores:", erro);

    alert(
      "Não foi possível salvar os dados. " +
      "O armazenamento do navegador pode estar cheio."
    );
  }
}


/* =========================================================
   ADICIONAR TIME
   ========================================================= */

function adicionarTime(nome = "", nivel = "Iniciante") {

  const div = document.createElement("div");

  div.className = "time-item";


  /* INPUT DO TIME */

  const inputNome = document.createElement("input");

  inputNome.type = "text";
  inputNome.className = "timeNome";
  inputNome.placeholder = "Nome do time";
  inputNome.value = nome;


  /* SELECT DO NÍVEL */

  const selectNivel = document.createElement("select");

  selectNivel.className = "timeNivel";


  const niveis = [
    "Iniciante",
    "Intermediário",
    "Livre"
  ];


  niveis.forEach(opcao => {

    const option = document.createElement("option");

    option.value = opcao;
    option.textContent = opcao;

    if (opcao === nivel) {
      option.selected = true;
    }

    selectNivel.appendChild(option);

  });


  /* BOTÃO REMOVER */

  const botaoRemover = document.createElement("button");

  botaoRemover.type = "button";
  botaoRemover.className = "btn-remover-time";
  botaoRemover.textContent = "❌";
  botaoRemover.title = "Remover time";
  botaoRemover.setAttribute(
    "aria-label",
    "Remover time"
  );


  botaoRemover.addEventListener(
    "click",
    function () {

      div.remove();

    }
  );


  /* MONTA O ITEM */

  div.appendChild(inputNome);
  div.appendChild(selectNivel);
  div.appendChild(botaoRemover);

  timesContainer.appendChild(div);
}


/* =========================================================
   PEGAR TIMES DO FORMULÁRIO
   ========================================================= */

function obterTimes() {

  const listaTimes = [];

  const itens = timesContainer.querySelectorAll(
    ".time-item"
  );


  itens.forEach(item => {

    const inputNome =
      item.querySelector(".timeNome");

    const selectNivel =
      item.querySelector(".timeNivel");


    if (!inputNome || !selectNivel) {
      return;
    }


    const nome = inputNome.value.trim();
    const nivel = selectNivel.value;


    if (nome !== "") {

      listaTimes.push({
        nome: nome,
        nivel: nivel
      });

    }

  });


  return listaTimes;
}


/* =========================================================
   PREVIEW DA FOTO
   ========================================================= */

fotoInput.addEventListener(
  "change",
  function () {

    const arquivo = this.files[0];


    if (!arquivo) {

      if (editIndex === null) {

        preview.src = "";
        preview.style.display = "none";

      }

      return;
    }


    /* Verifica se é realmente imagem */

    if (!arquivo.type.startsWith("image/")) {

      alert("Selecione um arquivo de imagem válido.");

      this.value = "";

      return;
    }


    const reader = new FileReader();


    reader.onload = function (evento) {

      preview.src = evento.target.result;

      preview.style.display = "block";

    };


    reader.readAsDataURL(arquivo);

  }
);


/* =========================================================
   SALVAR FORMULÁRIO
   ========================================================= */

form.addEventListener(
  "submit",
  function (evento) {

    evento.preventDefault();


    /* =========================
       CAMPOS
       ========================= */

    const nome =
      document.getElementById("nome")
        .value
        .trim();

    const time =
      document.getElementById("time")
        .value
        .trim();

    const categoria =
      document.getElementById("categoria")
        .value
        .trim();

    const nivel =
      document.getElementById("nivel")
        .value;


    /* =========================
       VALIDAÇÃO
       ========================= */

    if (!nome) {

      alert("Digite o nome do jogador.");

      document.getElementById("nome").focus();

      return;
    }


    if (!time) {

      alert("Digite o time atual.");

      document.getElementById("time").focus();

      return;
    }


    /* =========================
       TIMES
       ========================= */

    const listaTimes = obterTimes();


    /* =========================
       FOTO
       ========================= */

    const arquivoFoto =
      fotoInput.files[0];


    /*
      Se estamos editando e não
      escolhemos uma nova foto,
      mantém a foto antiga.
    */

    let fotoAtual = "";


    if (editIndex !== null) {

      fotoAtual =
        jogadores[editIndex]?.foto || "";

    }


    /* =========================
       FUNÇÃO DE SALVAMENTO
       ========================= */

    function finalizarSalvamento(foto) {

      const jogador = {

        nome: nome,

        time: time,

        categoria: categoria,

        nivel: nivel,

        times: listaTimes,

        foto: foto,

        avaliacoes:
          editIndex !== null
            ? [
                ...(jogadores[editIndex]
                  ?.avaliacoes || [])
              ]
            : []

      };


      /* =========================
         EDIÇÃO
         ========================= */

      if (editIndex !== null) {

        jogadores[editIndex] = jogador;

      }

      /* =========================
         NOVO CADASTRO
         ========================= */

      else {

        jogadores.push(jogador);

      }


      /* =========================
         FINALIZA
         ========================= */

      salvar();

      cancelarEdicao();

      renderizar();


      alert(
        editIndex === null
          ? "Jogador cadastrado com sucesso!"
          : "Jogador atualizado com sucesso!"
      );

    }


    /* =========================
       NOVA FOTO
       ========================= */

    if (arquivoFoto) {

      const reader =
        new FileReader();


      reader.onload = function (evento) {

        finalizarSalvamento(
          evento.target.result
        );

      };


      reader.readAsDataURL(
        arquivoFoto
      );

    }

    else {

      finalizarSalvamento(
        fotoAtual
      );

    }

  }
);


/* =========================================================
   EDITAR JOGADOR
   ========================================================= */

function editar(indice) {

  if (
    indice < 0 ||
    indice >= jogadores.length
  ) {

    return;

  }


  const jogador =
    jogadores[indice];


  /* =========================
     GUARDA ÍNDICE REAL
     ========================= */

  editIndex = indice;


  /* =========================
     CAMPOS
     ========================= */

  document.getElementById("nome").value =
    jogador.nome;

  document.getElementById("time").value =
    jogador.time;

  document.getElementById("categoria").value =
    jogador.categoria;

  document.getElementById("nivel").value =
    jogador.nivel;


  /* =========================
     TIMES
     ========================= */

  timesContainer.innerHTML = "";


  if (
    jogador.times &&
    jogador.times.length > 0
  ) {

    jogador.times.forEach(time => {

      adicionarTime(
        time.nome,
        time.nivel
      );

    });

  }

  else {

    adicionarTime();

  }


  /* =========================
     FOTO
     ========================= */

  if (jogador.foto) {

    preview.src =
      jogador.foto;

    preview.style.display =
      "block";

  }

  else {

    preview.src = "";

    preview.style.display =
      "none";

  }


  /* =========================
     INTERFACE
     ========================= */

  tituloFormulario.textContent =
    "Editar jogador";

  btnSalvar.textContent =
    "Salvar alterações";

  btnCancelarEdicao.style.display =
    "block";


  /* =========================
     ROLA ATÉ O FORMULÁRIO
     ========================= */

  form.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


/* =========================================================
   CANCELAR EDIÇÃO
   ========================================================= */

function cancelarEdicao() {

  editIndex = null;

  form.reset();


  timesContainer.innerHTML = "";


  /* Adiciona um campo de time inicial */

  adicionarTime();


  preview.src = "";

  preview.style.display =
    "none";


  tituloFormulario.textContent =
    "Cadastrar jogador";

  btnSalvar.textContent =
    "Cadastrar Jogador";

  btnCancelarEdicao.style.display =
    "none";

  fotoInput.value = "";

}


/* =========================================================
   BOTÃO CANCELAR
   ========================================================= */

btnCancelarEdicao.addEventListener(
  "click",
  cancelarEdicao
);


/* =========================================================
   EXCLUIR JOGADOR
   ========================================================= */

function excluir(indice) {

  if (
    indice < 0 ||
    indice >= jogadores.length
  ) {

    return;

  }


  const jogador =
    jogadores[indice];


  const confirmar =
    confirm(
      `Tem certeza que deseja excluir o jogador "${jogador.nome}"?`
    );


  if (!confirmar) {
    return;
  }


  jogadores.splice(
    indice,
    1
  );


  salvar();

  renderizar();


  /* Se estava editando esse jogador */

  if (editIndex === indice) {

    cancelarEdicao();

  }

}


/* =========================================================
   MÉDIA DAS AVALIAÇÕES
   ========================================================= */

function media(avaliacoes) {

  if (
    !Array.isArray(avaliacoes) ||
    avaliacoes.length === 0
  ) {

    return 0;

  }


  const valores =
    avaliacoes
      .map(Number)
      .filter(
        numero =>
          !isNaN(numero)
      );


  if (valores.length === 0) {
    return 0;
  }


  const soma =
    valores.reduce(
      (total, valor) =>
        total + valor,
      0
    );


  return soma / valores.length;
}


/* =========================================================
   ESCAPAR HTML
   Evita que conteúdo digitado seja
   interpretado como código HTML.
   ========================================================= */

function escaparHTML(valor) {

  const div =
    document.createElement("div");

  div.textContent =
    valor ?? "";

  return div.innerHTML;
}


/* =========================================================
   FOTO SEGURA
   ========================================================= */

function fotoSegura(foto) {

  if (
    typeof foto !== "string" ||
    foto.trim() === ""
  ) {

    return "https://via.placeholder.com/100";

  }


  /*
    Aceita somente imagens em Data URL
    ou URLs HTTP/HTTPS.
  */

  if (
    foto.startsWith("data:image/") ||
    foto.startsWith("https://") ||
    foto.startsWith("http://")
  ) {

    return foto;

  }


  return "https://via.placeholder.com/100";
}


/* =========================================================
   RENDERIZAR LISTA
   ========================================================= */

function renderizar() {

  listaJogadores.innerHTML = "";


  const textoBusca =
    busca.value
      .trim()
      .toLowerCase();


  const nivelFiltro =
    filtroNivel.value;


  /*
    IMPORTANTE:

    Aqui preservamos o índice REAL
    do jogador no array original.

    Isso corrige o bug de editar/excluir
    quando uma busca ou filtro está ativo.
  */

  jogadores.forEach(
    (jogador, indiceReal) => {

      const nomeNormalizado =
        jogador.nome
          .toLowerCase();


      const correspondeBusca =
        nomeNormalizado.includes(
          textoBusca
        );


      const correspondeNivel =
        !nivelFiltro ||
        jogador.nivel === nivelFiltro;


      if (
        !correspondeBusca ||
        !correspondeNivel
      ) {

        return;

      }


      const card =
        document.createElement("div");

      card.className =
        "card";


      /* =========================
         FOTO
         ========================= */

      const imagem =
        document.createElement("img");

      imagem.src =
        fotoSegura(
          jogador.foto
        );

      imagem.alt =
        `Foto de ${jogador.nome}`;


      /* =========================
         CONTEÚDO
         ========================= */

      const conteudo =
        document.createElement("div");


      const titulo =
        document.createElement("h3");

      titulo.textContent =
        jogador.nome;


      const timeAtual =
        document.createElement("p");

      timeAtual.textContent =
        `${jogador.time}${
          jogador.categoria
            ? ` (${jogador.categoria})`
            : ""
        }`;


      const nivel =
        document.createElement("p");

      nivel.textContent =
        `Nível: ${jogador.nivel}`;


      /* =========================
         MÉDIA
         ========================= */

      const mediaJogador =
        media(
          jogador.avaliacoes
        );


      const avaliacao =
        document.createElement("p");

      if (
        jogador.avaliacoes &&
        jogador.avaliacoes.length > 0
      ) {

        avaliacao.textContent =
          `⭐ Média: ${mediaJogador.toFixed(1)}`;

      }

      else {

        avaliacao.textContent =
          "⭐ Sem avaliações";

      }


      /* =========================
         TIMES ANTERIORES
         ========================= */

      const listaTimes =
        document.createElement("ul");


      if (
        jogador.times &&
        jogador.times.length > 0
      ) {

        jogador.times.forEach(
          time => {

            const li =
              document.createElement("li");

            li.textContent =
              `${time.nome} (${time.nivel})`;

            listaTimes.appendChild(li);

          }
        );

      }


      /* =========================
         BOTÃO EDITAR
         ========================= */

      const botaoEditar =
        document.createElement("button");

      botaoEditar.type =
        "button";

      botaoEditar.className =
        "btn-edit";

      botaoEditar.textContent =
        "Editar";


      botaoEditar.addEventListener(
        "click",
        function () {

          editar(indiceReal);

        }
      );


      /* =========================
         BOTÃO EXCLUIR
         ========================= */

      const botaoExcluir =
        document.createElement("button");

      botaoExcluir.type =
        "button";

      botaoExcluir.className =
        "btn-danger";

      botaoExcluir.textContent =
        "Excluir";


      botaoExcluir.addEventListener(
        "click",
        function () {

          excluir(indiceReal);

        }
      );


      /* =========================
         MONTA CARD
         ========================= */

      conteudo.appendChild(
        titulo
      );

      conteudo.appendChild(
        timeAtual
      );

      conteudo.appendChild(
        nivel
      );

      conteudo.appendChild(
        avaliacao
      );


      if (
        listaTimes.children.length > 0
      ) {

        conteudo.appendChild(
          listaTimes
        );

      }


      conteudo.appendChild(
        botaoEditar
      );

      conteudo.appendChild(
        botaoExcluir
      );


      card.appendChild(
        imagem
      );

      card.appendChild(
        conteudo
      );


      listaJogadores.appendChild(
        card
      );

    }
  );


  atualizarDashboard();

  atualizarRanking();

}


/* =========================================================
   DASHBOARD
   ========================================================= */

function atualizarDashboard() {

  /* =========================
     TOTAL
     ========================= */

  totalElement.textContent =
    `${jogadores.length} ${
      jogadores.length === 1
        ? "jogador"
        : "jogadores"
    }`;


  /* =========================
     MÉDIA GERAL
     ========================= */

  const jogadoresAvaliados =
    jogadores.filter(
      jogador =>
        Array.isArray(
          jogador.avaliacoes
        ) &&
        jogador.avaliacoes.length > 0
    );


  if (
    jogadoresAvaliados.length === 0
  ) {

    mediaElement.textContent =
      "0.0";

  }

  else {

    const soma =
      jogadoresAvaliados.reduce(
        (
          total,
          jogador
        ) =>
          total +
          media(
            jogador.avaliacoes
          ),
        0
      );


    const mediaGeral =
      soma /
      jogadoresAvaliados.length;


    mediaElement.textContent =
      mediaGeral.toFixed(1);

  }


  /* =========================
     MELHOR JOGADOR
     ========================= */

  const avaliados =
    jogadores
      .filter(
        jogador =>
          jogador.avaliacoes &&
          jogador.avaliacoes.length > 0
      )
      .sort(
        (a, b) =>
          media(b.avaliacoes) -
          media(a.avaliacoes)
      );


  if (
    avaliados.length === 0
  ) {

    melhorElement.textContent =
      "Nenhum";

  }

  else {

    const melhor =
      avaliados[0];


    melhorElement.textContent =
      `${melhor.nome} ⭐ ${media(
        melhor.avaliacoes
      ).toFixed(1)}`;

  }

}


/* =========================================================
   RANKING
   ========================================================= */

function atualizarRanking() {

  ranking.innerHTML = "";


  const titulo =
    document.createElement("h2");

  titulo.textContent =
    "🏆 Ranking";


  ranking.appendChild(
    titulo
  );


  const ordenado =
    [...jogadores]
      .sort(
        (a, b) =>
          media(b.avaliacoes) -
          media(a.avaliacoes)
      );


  if (
    ordenado.length === 0
  ) {

    const vazio =
      document.createElement("p");

    vazio.textContent =
      "Nenhum jogador cadastrado.";

    ranking.appendChild(
      vazio
    );

    return;

  }


  ordenado.forEach(
    (jogador, indice) => {

      const linha =
        document.createElement("p");


      const mediaJogador =
        media(
          jogador.avaliacoes
        );


      if (
        jogador.avaliacoes &&
        jogador.avaliacoes.length > 0
      ) {

        linha.textContent =
          `${indice + 1}º - ${
            jogador.nome
          } ⭐ ${
            mediaJogador.toFixed(1)
          }`;

      }

      else {

        linha.textContent =
          `${indice + 1}º - ${
            jogador.nome
          } - Sem avaliação`;

      }


      ranking.appendChild(
        linha
      );

    }
  );

}


/* =========================================================
   BUSCA
   ========================================================= */

busca.addEventListener(
  "input",
  function () {

    renderizar();

  }
);


/* =========================================================
   FILTRO
   ========================================================= */

filtroNivel.addEventListener(
  "change",
  function () {

    renderizar();

  }
);


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    /*
      Garante que o formulário
      comece com um campo de time.
    */

    if (
      timesContainer &&
      timesContainer.querySelectorAll(
        ".time-item"
      ).length === 0
    ) {

      adicionarTime();

    }


    renderizar();

  }
);
