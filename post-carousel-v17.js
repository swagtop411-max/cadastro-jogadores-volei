import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { collection, documentId, getDocs, getFirestore, query, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { feedImageUrl } from "./media-utils.js?v=20260907-1";

const page = location.pathname.split("/").pop() || "index.html";
const supported = page === "index.html" || page === "comunidade.html";

if (supported) {
  const firebaseConfig = {
    apiKey: "AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ",
    authDomain: "jogadores-de-volei.firebaseapp.com",
    projectId: "jogadores-de-volei",
    storageBucket: "jogadores-de-volei.firebasestorage.app",
    messagingSenderId: "48728914064",
    appId: "1:48728914064:web:1dd7aeb705319886f74015",
  };

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const cache = new Map();
  const checked = new Set();
  let running = false;
  let scheduled = false;

  function installStyles() {
    if (document.getElementById("postCarouselV17Styles")) return;
    const style = document.createElement("style");
    style.id = "postCarouselV17Styles";
    style.textContent = `
      .pc17{position:relative;width:100%;min-width:0;background:#071827;overflow:hidden}
      .pc17-track{display:flex;width:100%;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;overscroll-behavior-x:contain;scrollbar-width:none}
      .pc17-track::-webkit-scrollbar{display:none}
      .pc17-slide{flex:0 0 100%;width:100%;min-width:100%;max-height:780px;display:flex;align-items:center;justify-content:center;scroll-snap-align:center;scroll-snap-stop:always;background:#071827}
      .pc17-slide img{display:block;width:100%;height:auto;max-height:780px;object-fit:contain;background:#071827;cursor:zoom-in;image-rendering:auto}
      .pc17-control{position:absolute;top:50%;transform:translateY(-50%);z-index:5;width:42px;height:42px;border:1px solid rgba(255,255,255,.25);border-radius:999px;background:rgba(7,24,39,.7);color:#fff;font:900 24px/1 Arial,sans-serif;cursor:pointer;backdrop-filter:blur(10px)}
      .pc17-prev{left:10px}.pc17-next{right:10px}
      .pc17-control[hidden]{display:none}
      .pc17-count{position:absolute;top:10px;right:10px;z-index:5;padding:6px 9px;border-radius:999px;background:rgba(7,24,39,.72);color:#fff;font:900 9px/1 Arial,sans-serif;backdrop-filter:blur(10px)}
      .pc17-dots{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:5;display:flex;gap:5px;padding:6px 8px;border-radius:999px;background:rgba(7,24,39,.44);pointer-events:none}
      .pc17-dot{width:6px;height:6px;border-radius:999px;background:rgba(255,255,255,.48)}
      .pc17-dot.active{background:#fff;transform:scale(1.25)}
      .pc17-control:focus-visible{outline:3px solid #76e7ff;outline-offset:2px}
      @media(max-width:640px){.pc17-control{width:38px;height:38px;font-size:21px}.pc17-prev{left:7px}.pc17-next{right:7px}}
      @media(prefers-reduced-motion:reduce){.pc17-track{scroll-behavior:auto}}
    `;
    document.head.appendChild(style);
  }

  function postCards() {
    return [
      ...document.querySelectorAll("#homeFeed .social-post[data-post-id], #communityFeed .post-card[data-post-id]"),
    ];
  }

  function normalizeMedia(data) {
    if (!Array.isArray(data?.midias)) return [];
    return data.midias
      .map((item, index) => ({
        url: String(item?.url || item?.mediaUrl || item?.imagemUrl || "").trim(),
        order: Number.isFinite(Number(item?.ordem)) ? Number(item.ordem) : index,
      }))
      .filter((item) => item.url)
      .sort((a, b) => a.order - b.order)
      .slice(0, 10);
  }

  function setPosition(root, index) {
    const slides = root.querySelectorAll(".pc17-slide");
    const count = root.querySelector(".pc17-count");
    const prev = root.querySelector(".pc17-prev");
    const next = root.querySelector(".pc17-next");
    const dots = root.querySelectorAll(".pc17-dot");
    const safeIndex = Math.max(0, Math.min(slides.length - 1, index));

    if (count) count.textContent = `${safeIndex + 1}/${slides.length}`;
    if (prev) prev.hidden = safeIndex === 0;
    if (next) next.hidden = safeIndex === slides.length - 1;
    dots.forEach((dot, dotIndex) => dot.classList.toggle("active", dotIndex === safeIndex));
  }

  function buildCarousel(media, postId) {
    const root = document.createElement("div");
    root.className = "pc17";
    root.dataset.mediaGallery = postId;
    root.setAttribute("aria-label", `Carrossel com ${media.length} fotos`);

    const track = document.createElement("div");
    track.className = "pc17-track";
    track.setAttribute("role", "group");
    track.setAttribute("aria-label", "Fotos da publicação");

    media.forEach((item, index) => {
      const slide = document.createElement("div");
      slide.className = "pc17-slide";
      slide.setAttribute("aria-label", `Foto ${index + 1} de ${media.length}`);

      const image = document.createElement("img");
      image.src = feedImageUrl(item.url);
      image.dataset.fullSrc = item.url;
      image.dataset.mediaViewer = "1";
      image.loading = index === 0 ? "eager" : "lazy";
      image.decoding = "async";
      image.alt = `Foto ${index + 1} de ${media.length} da publicação`;
      slide.appendChild(image);
      track.appendChild(slide);
    });

    root.appendChild(track);

    const counter = document.createElement("span");
    counter.className = "pc17-count";
    counter.textContent = `1/${media.length}`;
    root.appendChild(counter);

    const dots = document.createElement("div");
    dots.className = "pc17-dots";
    dots.setAttribute("aria-hidden", "true");
    media.forEach((_, index) => {
      const dot = document.createElement("span");
      dot.className = `pc17-dot${index === 0 ? " active" : ""}`;
      dots.appendChild(dot);
    });
    root.appendChild(dots);

    const previous = document.createElement("button");
    previous.type = "button";
    previous.className = "pc17-control pc17-prev";
    previous.setAttribute("aria-label", "Foto anterior");
    previous.textContent = "‹";
    previous.hidden = true;

    const next = document.createElement("button");
    next.type = "button";
    next.className = "pc17-control pc17-next";
    next.setAttribute("aria-label", "Próxima foto");
    next.textContent = "›";

    function go(step) {
      const width = track.clientWidth || 1;
      const current = Math.round(track.scrollLeft / width);
      const target = Math.max(0, Math.min(media.length - 1, current + step));
      track.scrollTo({ left: target * width, behavior: "smooth" });
    }

    previous.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      go(-1);
    });
    next.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      go(1);
    });

    root.append(previous, next);

    let scrollFrame = 0;
    track.addEventListener(
      "scroll",
      () => {
        cancelAnimationFrame(scrollFrame);
        scrollFrame = requestAnimationFrame(() => {
          const width = track.clientWidth || 1;
          setPosition(root, Math.round(track.scrollLeft / width));
        });
      },
      { passive: true },
    );

    return root;
  }

  function upgradeCard(card) {
    if (card.dataset.carouselV17 === "1") return;
    const postId = card.dataset.postId;
    const data = cache.get(postId);
    if (!data) return;

    const media = normalizeMedia(data);
    if (media.length < 2) {
      card.dataset.carouselV17 = "1";
      return;
    }

    const homeFrame = card.querySelector(".social-media-frame");
    if (homeFrame) {
      const oldImage = homeFrame.querySelector(":scope > img");
      if (!oldImage) return;
      oldImage.replaceWith(buildCarousel(media, postId));
      card.dataset.carouselV17 = "1";
      return;
    }

    const communityImage = card.querySelector("img.post-image");
    if (communityImage) {
      communityImage.replaceWith(buildCarousel(media, postId));
      card.dataset.carouselV17 = "1";
    }
  }

  function groupsOfTen(ids) {
    const groups = [];
    for (let index = 0; index < ids.length; index += 10) groups.push(ids.slice(index, index + 10));
    return groups;
  }

  async function hydrate() {
    if (running) return;
    running = true;
    try {
      const cards = postCards();
      cards.forEach(upgradeCard);

      const ids = [...new Set(cards.map((card) => card.dataset.postId).filter(Boolean))].filter(
        (id) => !checked.has(id),
      );
      if (!ids.length) return;

      for (const idsGroup of groupsOfTen(ids)) {
        try {
          const snapshot = await getDocs(
            query(collection(db, "publicacoes"), where(documentId(), "in", idsGroup)),
          );
          snapshot.docs.forEach((post) => cache.set(post.id, post.data()));
        } catch (error) {
          console.warn("Carrossel V17: não foi possível consultar este lote.", error);
        }
        idsGroup.forEach((id) => checked.add(id));
      }

      cards.forEach(upgradeCard);
    } finally {
      running = false;
    }
  }

  function scheduleHydrate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      hydrate().catch((error) => console.warn("Carrossel V17:", error));
    });
  }

  function boot() {
    installStyles();
    const roots = [document.getElementById("homeFeed"), document.getElementById("communityFeed")].filter(Boolean);
    if (!roots.length) {
      setTimeout(boot, 150);
      return;
    }

    const observer = new MutationObserver(scheduleHydrate);
    roots.forEach((root) => observer.observe(root, { childList: true, subtree: true }));
    window.addEventListener("bd:carousel-published", () => {
      checked.clear();
      scheduleHydrate();
    });
    scheduleHydrate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}
