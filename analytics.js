// Google Analytics 4 - Banco de Dados de Atletas
// ID de medição: G-K033D1K41Y
const GA_ID = "G-K033D1K41Y";
const GA_PROPERTY = "https://analytics.google.com/analytics/web/";

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

// Ajustes de responsividade do painel administrativo.
// No celular, as abas passam a ocupar duas colunas para que
// "📊 Estatísticas" fique visível sem exigir rolagem horizontal.
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
    .stats-grid {
      grid-template-columns: 1fr !important;
    }
    .stats-links {
      grid-template-columns: 1fr !important;
    }
    .stats-link {
      min-height: 62px !important;
    }
  }
`;
document.head.appendChild(mobileAdminStyle);

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

  // Corrige links antigos/específicos do Analytics que podem falhar no celular.
  // Ao clicar, abrimos a interface oficial do Google Analytics e deixamos
  // o próprio Google direcionar para a propriedade disponível após o login.
  document.querySelectorAll(".analytics-cta, .stats-link").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      window.location.href = GA_PROPERTY;
    });
  });

  // Cards da aba Estatísticas.
  document.querySelectorAll(".stats-card").forEach((card) => {
    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");
    card.setAttribute("title", "Abrir o Google Analytics");
    card.style.cursor = "pointer";
    card.style.transition = "transform .2s ease, border-color .2s ease, box-shadow .2s ease";

    const openReport = () => {
      trackEvent("analytics_report_click", {
        relatorio: card.querySelector("strong")?.textContent?.trim() || "estatistica"
      });
      window.location.href = GA_PROPERTY;
    };

    card.addEventListener("click", openReport);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openReport();
      }
    });

    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-3px)";
      card.style.borderColor = "rgba(217,169,63,.55)";
      card.style.boxShadow = "0 12px 28px rgba(0,0,0,.25)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
      card.style.borderColor = "";
      card.style.boxShadow = "";
    });
  });
});
