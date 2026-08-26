// Google Analytics 4 - Banco de Dados de Atletas
// Rastreamento de visitas e ações do site.

const GA_ID = "G-K033D1K41Y";
// URL em formato de propriedade GA4, mais estável para acesso direto.
const GA_PROPERTY_URL = "https://analytics.google.com/analytics/web/#/p532490731/reports/intelligenthome";
const GA_REALTIME_URL = "https://analytics.google.com/analytics/web/#/p532490731/reports/realtime";

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

// Correções específicas para toque no celular.
const mobileAdminStyle = document.createElement("style");
mobileAdminStyle.textContent = `
  .admin-tab,
  .analytics-cta,
  .stats-link {
    pointer-events: auto !important;
    position: relative !important;
    z-index: 20 !important;
    cursor: pointer !important;
    touch-action: manipulation !important;
  }

  @media (max-width: 700px) {
    .admin-tabs {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      overflow: visible !important;
      width: 100% !important;
      position: relative !important;
      z-index: 30 !important;
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

function openAnalytics(url = GA_PROPERTY_URL) {
  // Usa a própria aba. Isso evita bloqueios de pop-up/nova aba no Android.
  window.location.assign(url);
}

document.addEventListener("DOMContentLoaded", () => {
  const trackClick = (selector, eventName, extra = {}) => {
    document.querySelectorAll(selector).forEach(el => {
      el.addEventListener("click", () => trackEvent(eventName, extra), { passive: true });
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
    }, { passive: true });
  }

  const searchButton = document.getElementById("btnPesquisar");
  if (searchButton) {
    searchButton.addEventListener("click", () => {
      trackEvent("pesquisa_atletas", { origem: "site" });
    }, { passive: true });
  }

  const cadastroForm = document.getElementById("cadastroAtletaForm");
  if (cadastroForm) {
    cadastroForm.addEventListener("submit", () => {
      trackEvent("cadastro_enviado", { origem: "cadastro_atleta" });
    });
  }

  // Links de estatísticas: usar URL GA4 estável e abrir na mesma aba.
  document.querySelectorAll(".analytics-cta, .stats-link").forEach(link => {
    const text = link.textContent?.trim() || "Google Analytics";
    const isRealtime = /tempo real/i.test(text);
    const url = isRealtime ? GA_REALTIME_URL : GA_PROPERTY_URL;

    link.href = url;
    link.removeAttribute("target");
    link.removeAttribute("rel");

    link.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      trackEvent("analytics_externo_click", {
        destino: url,
        relatorio: text
      });
      openAnalytics(url);
    });
  });
});
