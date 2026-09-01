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
