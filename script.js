const form = document.getElementById("formJogador");
const lista = document.getElementById("listaJogadores");

// 🔹 Carregar do "banco"
let jogadores = JSON.parse(localStorage.getItem("jogadores")) || [];

form.addEventListener("submit", function(e) {
  e.preventDefault();

  const nome = document.getElementById("nome").value;
  const nivel = document.getElementById("nivel").value;
  const historico = document.getElementById("historico").value;
  const fotoInput = document.getElementById("foto");

  const reader = new FileReader();

  reader.onload = function() {
    const jogador = {
      nome,
      nivel,
      historico,
      foto: reader.result,
      avaliacoes: []
    };

    jogadores.push(jogador);

    salvar();
    renderizar();
    form.reset();
  };

  if (fotoInput.files[0]) {
    reader.readAsDataURL(fotoInput.files[0]);
  }
});

function salvar() {
  localStorage.setItem("jogadores", JSON.stringify(jogadores));
}

function renderizar() {
  lista.innerHTML = "";

  jogadores.forEach((j, index) => {
    lista.innerHTML += `
      <div class="card">
        <img src="${j.foto || ''}" />
        <div>
          <h3>${j.nome}</h3>
          <p><strong>Nível:</strong> ${j.nivel}</p>
          <p><strong>Histórico:</strong> ${j.historico}</p>

          <input type="number" min="1" max="5" id="nota${index}">
          <button onclick="avaliar(${index})">Avaliar</button>

          <p>Média: ${media(j.avaliacoes)}</p>
        </div>
      </div>
    `;
  });
}

function avaliar(index) {
  const nota = document.getElementById(`nota${index}`).value;

  if (nota) {
    jogadores[index].avaliacoes.push(Number(nota));
    salvar();
    renderizar();
  }
}

function media(avaliacoes) {
  if (avaliacoes.length === 0) return "Sem avaliação";

  const soma = avaliacoes.reduce((a, b) => a + b, 0);
  return (soma / avaliacoes.length).toFixed(1);
}

// 🔹 Carregar ao iniciar
renderizar();
