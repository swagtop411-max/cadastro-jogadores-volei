// Google Analytics 4 - Banco de Dados de Atletas
// ID de medição: G-K033D1K41Y
const GA_ID = "G-K033D1K41Y";

if (!window.__ga4_loaded) {
  window.__ga4_loaded = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, {
    anonymize_ip: true,
    send_page_view: true
  });
}

export function trackEvent(name, params = {}) {
  if (typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}

// Rastreamento automático das principais ações do site.
// Não coleta nome, telefone, e-mail ou outros dados pessoais.
document.addEventListener("DOMContentLoaded", () => {
  const trackClick = (selector, eventName, extra = {}) => {
    document.querySelectorAll(selector).forEach(el => {
      el.addEventListener("click", () => trackEvent(eventName, extra));
    });
  };

  trackClick(".whatsapp-top-cta, .whatsapp-cadastro", "whatsapp_click", {
    origem: "site"
  });

  trackClick(".championship-cta", "campeonatos_click", {
    origem: "site"
  });

  trackClick(".hero-button", "ver_atletas_click", {
    origem: "site"
  });

  trackClick(".admin-cta", "painel_admin_click", {
    origem: "site"
  });

  const cadastroLink = document.querySelector('a[href*="cadastro-atleta"]');
  if (cadastroLink) {
    cadastroLink.addEventListener("click", () => trackEvent("cadastro_aberto", {
      origem: "site"
    }));
  }

  const searchButton = document.getElementById("btnPesquisar");
  if (searchButton) {
    searchButton.addEventListener("click", () => trackEvent("pesquisa_atletas", {
      origem: "site"
    }));
  }

  const cadastroForm = document.getElementById("cadastroAtletaForm");
  if (cadastroForm) {
    cadastroForm.addEventListener("submit", () => trackEvent("cadastro_enviado", {
      origem: "cadastro_atleta"
    }));
  }
});
