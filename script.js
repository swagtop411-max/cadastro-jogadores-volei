let jogadores = JSON.parse(localStorage.getItem("jogadores")) || [];
let editIndex = null;

const form = document.getElementById("formJogador");
const busca = document.getElementById("busca");
const filtroNivel = document.getElementById("filtroNivel");
const fotoInput = document.getElementById("foto");
const preview = document.getElementById("preview");

function adicionarTime() {
  const div = document.createElement("div");
  div.classList.add("time-item");

  div.innerHTML = `
    <input type="text" class="timeNome">
    <select class="timeNivel">
      <option>Iniciante</option>
      <option>Intermediário</option>
      <option>Livre</option>
    </select>
    <button onclick="this.parentElement.remove()">❌</button>
  `;

  document.getElementById("timesContainer").appendChild(div);
}

/* PREVIEW DA FOTO */
fotoInput.addEventListener("change", function() {
  const file = this.files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  }
});

/* SALVAR */
form.addEventListener("submit", function(e) {
  e.preventDefault();

  const nome = document.getElementById("nome").value;
  const time = document.getElementById("time").value;
  const categoria = document.getElementById("categoria").value;
  const nivel = document.getElementById("nivel").value;

  const timesInputs = document.querySelectorAll(".time-item");
  let listaTimes = [];

  timesInputs.forEach(item => {
    const nomeTime = item.querySelector(".timeNome").value;
    const nivelTime = item.querySelector(".timeNivel").value;

    if (nomeTime) {
      listaTimes.push({ nome: nomeTime, nivel: nivelTime });
    }
  });

  const salvarJogador = (fotoBase64="") => {

    const jogador = {
      nome,
      time,
      categoria,
      nivel,
      times: listaTimes,
      foto: fotoBase64 || (editIndex !== null ? jogadores[editIndex].foto : ""),
      avaliacoes: editIndex !== null ? jogadores[editIndex].avaliacoes : []
    };

    if (editIndex !== null) {
      jogadores[editIndex] = jogador;
      editIndex = null;
    } else {
      jogadores.push(jogador);
    }

    salvar();
    renderizar();
    form.reset();
    preview.style.display = "none";
  };

  if (fotoInput.files[0]) {
    const reader = new FileReader();
    reader.onload = () => salvarJogador(reader.result);
    reader.readAsDataURL(fotoInput.files[0]);
  } else {
    salvarJogador();
  }
});

function salvar() {
  localStorage.setItem("jogadores", JSON.stringify(jogadores));
}

function media(av) {
  if (!av.length) return 0;
  return av.reduce((a,b)=>a+b,0)/av.length;
}

function renderizar() {
  const lista = document.getElementById("listaJogadores");
  lista.innerHTML = "";

  jogadores
    .filter(j => j.nome.toLowerCase().includes(busca.value.toLowerCase()))
    .filter(j => !filtroNivel.value || j.nivel === filtroNivel.value)
    .forEach((j,i) => {

      lista.innerHTML += `
        <div class="card">
          <img src="${j.foto || 'https://via.placeholder.com/100'}">
          <div>
            <h3>${j.nome}</h3>
            <p>${j.time} (${j.categoria})</p>
            <p>${j.nivel}</p>

            <ul>
              ${j.times.map(t => `<li>${t.nome} (${t.nivel})</li>`).join("")}
            </ul>

            <button class="btn-edit" onclick="editar(${i})">Editar</button>
            <button class="btn-danger" onclick="excluir(${i})">Excluir</button>
          </div>
        </div>
      `;
    });

  atualizarDashboard();
  atualizarRanking();
}

function editar(i) {
  const j = jogadores[i];

  document.getElementById("nome").value = j.nome;
  document.getElementById("time").value = j.time;
  document.getElementById("categoria").value = j.categoria;
  document.getElementById("nivel").value = j.nivel;

  const container = document.getElementById("timesContainer");
  container.innerHTML = "";

  j.times.forEach(t => {
    const div = document.createElement("div");
    div.classList.add("time-item");

    div.innerHTML = `
      <input type="text" class="timeNome" value="${t.nome}">
      <select class="timeNivel">
        <option ${t.nivel=="Iniciante"?"selected":""}>Iniciante</option>
        <option ${t.nivel=="Intermediário"?"selected":""}>Intermediário</option>
        <option ${t.nivel=="Livre"?"selected":""}>Livre</option>
      </select>
    `;

    container.appendChild(div);
  });

  if (j.foto) {
    preview.src = j.foto;
    preview.style.display = "block";
  }

  editIndex = i;
}

function excluir(i) {
  jogadores.splice(i,1);
  salvar();
  renderizar();
}

function atualizarDashboard() {
  document.getElementById("total").innerHTML = jogadores.length + " jogadores";
}

function atualizarRanking() {
  const ranking = document.getElementById("ranking");
  ranking.innerHTML = "<h2>Ranking</h2>";

  const ordenado = [...jogadores].sort((a,b)=>media(b.avaliacoes)-media(a.avaliacoes));

  ordenado.forEach((j,i)=>{
    ranking.innerHTML += `<p>${i+1}º - ${j.nome}</p>`;
  });
}

busca.addEventListener("input", renderizar);
filtroNivel.addEventListener("change", renderizar);

renderizar();
