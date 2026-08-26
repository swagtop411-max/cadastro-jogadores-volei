// Google Analytics 4 - Banco de Dados de Atletas
// Este arquivo registra as visitas e ações do site no Google Analytics.
// As estatísticas de atletas continuam no sistema, mas NÃO substituem as
// estatísticas de visitas do Google Analytics.

const GA_ID = "G-K033D1K41Y";
const GA_PROPERTY_URL = "https://analytics.google.com/analytics/web/#/a390906538p532490731/";

if (!window.__ga4_loaded) {
  window.__ga4_loaded = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };

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

// Responsividade dos botões do painel administrativo.
const mobileAdminStyle = document.createElement("style");
mobileAdminStyle.textContent = `
  @media (max-width: 700px) {
    .admin-tabs {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      overflow: visible !important;
      width: 100% !important;
    }

    .admin-tab {
      width: 100% !important;
      min-width: 0 !important;
      white-space: normal !important;
      min-height: 48px !important;
      padding: 10px 8px !important;
    }

    .stats-grid,
    .stats-links {
      grid-template-columns: 1fr !important;
    }

    .stats-link {
      min-height: 62px !important;
    }
  }
`;
document.head.appendChild(mobileAdminStyle);

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
    cadastroLink.addEventListener("click", () => {
      trackEvent("cadastro_aberto", { origem: "site" });
    });
  }

  const searchButton = document.getElementById("btnPesquisar");
  if (searchButton) {
    searchButton.addEventListener("click", () => {
      trackEvent("pesquisa_atletas", { origem: "site" });
    });
  }

  const cadastroForm = document.getElementById("cadastroAtletaForm");
  if (cadastroForm) {
    cadastroForm.addEventListener("submit", () => {
      trackEvent("cadastro_enviado", { origem: "cadastro_atleta" });
    });
  }

  // IMPORTANTE:
  // Não interceptamos o botão "VER ESTATÍSTICAS".
  // Ele deve abrir o Google Analytics, onde estão os dados reais de:
  // visitantes, usuários, sessões, páginas, dispositivos, localização,
  // eventos e ações realizadas dentro do site.
  document.querySelectorAll(".analytics-cta, .stats-link").forEach(link => {
    link.addEventListener("click", () => {
      trackEvent("analytics_externo_click", {
        destino: GA_PROPERTY_URL,
        relatorio: link.querySelector("span")?.textContent?.trim() || link.textContent?.trim() || "Google Analytics"
      });
    });
  });
});
