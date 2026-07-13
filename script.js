const driveConfig = {
  apiUrl: "https://script.google.com/macros/s/AKfycbzNbxjI3TjrFb-dgMDGASMRDEzTmUhmzpR4dXausDD2ZtLh9nJ2-_DTqbhiAZWamjKN9g/exec",
};

const localGalleries = [
  { title: "Collaborations", folder: "collaborations" },
  { title: "Projects", folder: "projects" },
  { title: "Candidates", folder: "candidates" },
];

const galleryRoot = document.querySelector("#gallery-sections");
const driveMenuLinks = document.querySelector("#drive-menu-links");
const dialog = document.querySelector("#image-dialog");
const dialogImage = dialog.querySelector("img");
const dialogCaption = dialog.querySelector("p");
let marqueeTimers = [];
let wakeLock = null;

async function getLocalImages(gallery) {
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
  const galleries = await getDriveGalleries() || await getLocalGalleries();
  renderDriveMenu(galleries);
  galleryRoot.innerHTML = galleries.map(({ title, images }) => {
    const id = `gallery-${slugify(title)}`;
    if (!images.length) return `<section><div class="gallery-group-header"><h3>${title}</h3></div><p class="gallery-empty">Images will appear here soon.</p></section>`;
    return `<section id="${id}" class="drive-gallery"><div class="gallery-group-header"><h3>${title}</h3><span>${images.length} images</span></div><div class="marquee-window"><div class="marquee-image-grid"><img class="marquee-image" alt="${title}"><img class="marquee-image" alt="${title}"><img class="marquee-image" alt="${title}"></div><p class="marquee-status">Loading images…</p></div></section>`;
  }).join("");
  startMarquees(galleries);
}

function startMarquees(galleries) {
  marqueeTimers.forEach((timer) => window.clearTimeout(timer));
  marqueeTimers = [];

  galleries.forEach((gallery) => {
    const section = document.querySelector(`#gallery-${slugify(gallery.title)}`);
    const imageElements = Array.from(section?.querySelectorAll(".marquee-image") || []);
    const status = section?.querySelector(".marquee-status");
    if (!imageElements.length || !status) return;
    let current = 0;

    const showNextBatch = () => {
      if (!section.isConnected) return;
      const batch = imageElements.map((_, offset) => gallery.images[(current + offset) % gallery.images.length]);
      Promise.all(batch.map((image) => loadDriveImage(image))).then((loaded) => {
        if (!section.isConnected) return;
        loaded.forEach((image, index) => {
          const element = imageElements[index];
          if (image) {
            element.src = image.source;
            element.alt = image.name;
            element.classList.add("is-visible");
          } else {
            element.removeAttribute("src");
            element.classList.remove("is-visible");
          }
        });
        const last = Math.min(current + imageElements.length, gallery.images.length);
        status.textContent = `Images ${current + 1}–${last} of ${gallery.images.length}`;
        current = (current + imageElements.length) % gallery.images.length;
        marqueeTimers.push(window.setTimeout(showNextBatch, 5000));
      });
    };

    showNextBatch();
  });
}

function loadDriveImage(image) {
  return new Promise((resolve) => {
    const loader = new Image();
    loader.onload = () => resolve(image);
    loader.onerror = () => resolve(null);
    loader.src = image.source;
  });
}

function slugify(value) {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function renderDriveMenu(galleries) {
  driveMenuLinks.innerHTML = galleries.map(({ title }) => {
    const id = `gallery-${slugify(title)}`;
    return `<a href="#${id}">${title}</a>`;
  }).join("");
}

async function getDriveGalleries() {
  if (!driveConfig.apiUrl) return null;
  try {
    const response = await fetch(driveConfig.apiUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Google Drive gallery API is unavailable");
    return normaliseDriveGalleries(await response.json());
  } catch (error) {
    try {
      return await loadDriveGalleriesWithJsonp();
    } catch (jsonpError) {
      console.warn("Google Drive galleries could not load. Using local images instead.", jsonpError);
      return null;
    }
  }
}

function normaliseDriveGalleries(data) {
  if (!Array.isArray(data)) throw new Error("Invalid Google Drive gallery data");
  const galleries = data.map((gallery) => ({
    title: String(gallery.name || "Gallery"),
    images: Array.isArray(gallery.images) ? gallery.images.map((source, index) => ({
      source,
      name: `${gallery.name || "Gallery"} image ${index + 1}`,
    })) : [],
  })).filter((gallery) => gallery.images.length);
  return galleries.length ? galleries : null;
}

function loadDriveGalleriesWithJsonp() {
  return new Promise((resolve, reject) => {
    const callback = `driveGallery_${Date.now()}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => cleanup(new Error("Google Drive request timed out")), 12000);

    function cleanup(error) {
      window.clearTimeout(timeout);
      delete window[callback];
      script.remove();
      if (error) reject(error);
    }

    window[callback] = (data) => {
      try {
        const galleries = normaliseDriveGalleries(data);
        cleanup();
        resolve(galleries);
      } catch (error) {
        cleanup(error);
      }
    };

    script.onerror = () => cleanup(new Error("Google Drive JSONP request failed"));
    script.src = `${driveConfig.apiUrl}${driveConfig.apiUrl.includes("?") ? "&" : "?"}callback=${callback}`;
    document.head.append(script);
  });
}

async function getLocalGalleries() {
  const loaded = await Promise.all(localGalleries.map(async (gallery) => ({ ...gallery, files: await getLocalImages(gallery) })));
  return loaded.map(({ title, folder, files }) => ({
    title,
    images: files.map((file) => ({
      source: `${folder}/${encodeURIComponent(file)}`,
      name: readableName(file),
    })),
  })).filter((gallery) => gallery.images.length);
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
window.setInterval(renderGalleries, 2 * 60 * 1000);

async function keepPresentationAwake() {
  if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => { wakeLock = null; });
  } catch (error) {
    console.info("Screen wake lock requires a supported browser and may need one click to activate.", error);
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    keepPresentationAwake();
    renderGalleries();
  }
});

// Browsers that require a user gesture will enable presentation mode on the first click or tap.
window.addEventListener("pointerdown", keepPresentationAwake, { once: true, passive: true });
keepPresentationAwake();
