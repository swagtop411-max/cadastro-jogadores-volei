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
