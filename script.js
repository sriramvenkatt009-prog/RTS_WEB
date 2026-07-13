const galleries = [
  { title: "Collaborations", folder: "collaborations" },
  { title: "Projects", folder: "projects" },
  { title: "Candidates", folder: "candidates" },
];

const galleryRoot = document.querySelector("#gallery-sections");
const dialog = document.querySelector("#image-dialog");
const dialogImage = dialog.querySelector("img");
const dialogCaption = dialog.querySelector("p");

async function getImages(gallery) {
  try {
    const response = await fetch(`${gallery.folder}/manifest.json`, { cache: "no-store" });
    if (!response.ok) throw new Error("Manifest unavailable");
    const files = await response.json();
    return files.filter((file) => /\.(jpe?g|png|gif|webp|svg|avif)$/i.test(file));
  } catch {
    return [];
  }
}

function readableName(file) {
  return decodeURIComponent(file).replace(/[-_]/g, " ").replace(/\.[^.]+$/, "");
}

async function renderGalleries() {
  const loaded = await Promise.all(galleries.map(async (gallery) => ({ ...gallery, files: await getImages(gallery) })));
  galleryRoot.innerHTML = loaded.map(({ title, folder, files }) => {
    if (!files.length) return `<section><div class="gallery-group-header"><h3>${title}</h3></div><p class="gallery-empty">Images will appear here soon.</p></section>`;
    const images = files.map((file) => {
      const source = `${folder}/${encodeURIComponent(file)}`;
      const name = readableName(file);
      return `<button class="gallery-image" type="button" data-source="${source}" data-caption="${name}" aria-label="Open ${name}"><img src="${source}" alt="${name}" loading="lazy"></button>`;
    }).join("");
    return `<section><div class="gallery-group-header"><h3>${title}</h3><span>${files.length} images</span></div><div class="image-grid">${images}</div></section>`;
  }).join("");
}

document.querySelector(".menu-toggle").addEventListener("click", (event) => {
  const nav = document.querySelector(".site-navigation");
  const open = nav.classList.toggle("is-open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});

document.querySelector(".site-navigation").addEventListener("click", () => {
  document.querySelector(".site-navigation").classList.remove("is-open");
  document.querySelector(".menu-toggle").setAttribute("aria-expanded", "false");
});

galleryRoot.addEventListener("click", (event) => {
  const button = event.target.closest(".gallery-image");
  if (!button) return;
  dialogImage.src = button.dataset.source;
  dialogImage.alt = button.dataset.caption;
  dialogCaption.textContent = button.dataset.caption;
  dialog.showModal();
});

dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
document.querySelector("#year").textContent = new Date().getFullYear();
renderGalleries();
