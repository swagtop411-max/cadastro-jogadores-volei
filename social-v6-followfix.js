import("./media-viewer.js?v=20260907-1").catch(error=>console.warn("Media Viewer V15:",error));
import("./feed-experience-v16.js?v=20260907-1").catch(error=>console.warn("Feed Experience V16:",error));
import("./post-carousel-v17.js?v=20260907-1").catch(error=>console.warn("Post Carousel V17:",error));
import("./multi-media-publisher-v17.js?v=20260907-1").catch(error=>console.warn("Multi Media Publisher V17:",error));

function neutralizePrivateFollowButton() {
  const button = document.querySelector('#followButton[data-v6-private="1"]');
  if (!button || button.dataset.v6LegacyNeutralized === "1") return;

  button.dataset.v6LegacyNeutralized = "1";
  button.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", neutralizePrivateFollowButton, { once: true });
} else {
  neutralizePrivateFollowButton();
}

const observer = new MutationObserver(() => neutralizePrivateFollowButton());
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-v6-private"] });