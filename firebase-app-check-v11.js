import initializedAppCheck from "./firebase-app-check-init-v60.js";
await import("./auth-gate-v53.js?v=20260915-53");
await import("./notification-router-v49.js?v=20260915-49").catch(error=>console.warn("Roteamento de notificações V49:",error));
await import("./admin-message-v49.js?v=20260915-49").catch(error=>console.warn("Mensagens administrativas V49:",error));
import("./admin-shortcut-v34.js?v=20260909-47").catch(error=>console.warn("Atalho ADM:",error));
import("./ugc-safety-v41.js?v=20260909-47").catch(error=>console.warn("Segurança persistente da comunidade:",error));
import("./age-gate-v47.js?v=20260909-47").catch(error=>console.warn("Barreira 18+ V47:",error));
import("./terms-consent-v47.js?v=20260913-50").catch(error=>console.warn("Aceite legal V50:",error));

export default initializedAppCheck;
