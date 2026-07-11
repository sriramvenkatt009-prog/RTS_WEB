const driveConfig = {
  // Paste your deployed Google Apps Script web app URL here.
  apiUrl: "",
};

const localGalleryFolders = [
  { name: "Collaborations", folder: "collaborations", eyebrow: "Industry network" },
  { name: "Projects", folder: "projects", eyebrow: "Practical learning" },
  { name: "Candidates", folder: "candidates", eyebrow: "Placed talent" },
];

const imageExtensions = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"]);
const dynamicMenu = document.querySelector("#dynamic-menu-links");
const galleryRoot = document.querySelector("#dynamic-gallery-sections");
const heroMessages = Array.from(document.querySelectorAll(".hero-slide"));
const infoSlides = Array.from(document.querySelectorAll(".info-slide"));
const infoDotsRoot = document.querySelector(".info-dots");
const sliders = new Map();
let activeHeroMessage = 0;
let activeInfoSlide = 0;

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function loadImagesFromManifest(folder) {
  const response = await fetch(`${folder}/manifest.json`);

  if (!response.ok) {
    return [];
  }

  const files = await response.json();
  return files
    .filter((file) => imageExtensions.has((file.split(".").pop() || "").toLowerCase()))
    .map((file) => `${folder}/${file}`);
}

async function loadLocalGalleries() {
  const galleries = await Promise.all(
    localGalleryFolders.map(async (item) => ({
      ...item,
      id: slugify(item.name),
      images: await loadImagesFromManifest(item.folder),
    }))
  );

  return galleries.filter((gallery) => gallery.images.length);
}

async function loadDriveGalleries() {
  if (!driveConfig.apiUrl) {
    return [];
  }

  const response = await fetch(driveConfig.apiUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Google Drive gallery API failed");
  }

  const galleries = await response.json();
  return galleries
    .map((gallery) => ({
      id: slugify(gallery.name || "gallery"),
      name: gallery.name || "Gallery",
      folder: gallery.folderId || gallery.name || "drive",
      eyebrow: gallery.description || "Google Drive gallery",
      images: Array.isArray(gallery.images) ? gallery.images : [],
    }))
    .filter((gallery) => gallery.images.length);
}

function renderMenu(galleries) {
  dynamicMenu.innerHTML = galleries
    .map((gallery) => `<a href="#${gallery.id}">${gallery.name}</a>`)
    .join("");
}

function renderGallerySections(galleries) {
  galleryRoot.innerHTML = galleries
    .map(
      (gallery, index) => `
        <section id="${gallery.id}" class="gallery-section page-section gallery-tone-${index % 3}" aria-labelledby="${gallery.id}-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">${gallery.eyebrow}</p>
              <h2 id="${gallery.id}-title">${gallery.name}</h2>
            </div>
            <span class="image-count">${gallery.images.length} images</span>
          </div>

          <div class="marquee-shell" aria-live="polite">
            <div class="image-marquee" data-gallery-id="${gallery.id}">
              <p class="loading">Loading ${gallery.name} images...</p>
            </div>
          </div>
        </section>
      `
    )
    .join("");

  galleries.forEach((gallery) => {
    const marquee = galleryRoot.querySelector(`[data-gallery-id="${gallery.id}"]`);
    renderImages(marquee, gallery.images, gallery.name);
  });
}

function slideWidth(marquee) {
  const firstItem = marquee.querySelector(".marquee-item");
  const styles = window.getComputedStyle(marquee);
  const gap = Number.parseFloat(styles.columnGap || styles.gap || "0");
  return firstItem ? firstItem.getBoundingClientRect().width + gap : 0;
}

function moveGallery(marquee, totalImages) {
  const state = sliders.get(marquee);

  if (!state) {
    return;
  }

  state.currentSlide += 1;
  marquee.style.transition = "transform 1200ms ease";
  marquee.style.transform = `translateX(-${state.currentSlide * slideWidth(marquee)}px)`;

  if (state.currentSlide === totalImages) {
    window.setTimeout(() => {
      state.currentSlide = 0;
      marquee.style.transition = "none";
      marquee.style.transform = "translateX(0)";
      marquee.offsetHeight;
      marquee.style.transition = "transform 1200ms ease";
    }, 1250);
  }
}

function startGallerySlider(marquee, totalImages) {
  const state = sliders.get(marquee);

  const tick = () => {
    moveGallery(marquee, totalImages);
    state.timer = window.setTimeout(tick, 4200);
  };

  state.timer = window.setTimeout(tick, 3000);
}

function renderImages(marquee, images, galleryName) {
  if (!images.length) {
    marquee.innerHTML = `<p class="loading">No images found for ${galleryName}.</p>`;
    return;
  }

  const existingState = sliders.get(marquee);

  if (existingState?.timer) {
    clearTimeout(existingState.timer);
  }

  sliders.set(marquee, { currentSlide: 0, timer: null });

  const displayImages = images.length >= 3 ? images : Array.from({ length: 3 }, (_, index) => images[index % images.length]);
  const carouselImages = [...displayImages, ...displayImages.slice(0, 3)];

  marquee.innerHTML = carouselImages
    .map((src, index) => {
      const cleanName = decodeURIComponent(src.split("/").pop() || `${galleryName} image ${index + 1}`);
      return `
        <figure class="marquee-item">
          <img src="${src}" alt="${cleanName}" loading="lazy">
        </figure>
      `;
    })
    .join("");

  marquee.style.transform = "translateX(0)";
  startGallerySlider(marquee, displayImages.length);
}

function scrollToActiveSection() {
  const pageSections = Array.from(document.querySelectorAll(".page-section"));
  const sectionIds = new Set(pageSections.map((section) => section.id));
  const selectedId = window.location.hash.replace("#", "") || "home";
  const activeId = sectionIds.has(selectedId) ? selectedId : "home";

  window.requestAnimationFrame(() => {
    document.getElementById(activeId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function showHeroMessage(index) {
  activeHeroMessage = index % heroMessages.length;

  heroMessages.forEach((message, messageIndex) => {
    message.classList.toggle("is-active", messageIndex === activeHeroMessage);
  });
}

function initHeroMessages() {
  if (heroMessages.length < 2) {
    return;
  }

  showHeroMessage(0);

  window.setInterval(() => {
    showHeroMessage(activeHeroMessage + 1);
  }, 6000);
}

function showInfoSlide(index) {
  activeInfoSlide = index % infoSlides.length;

  infoSlides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === activeInfoSlide);
  });

  document.querySelectorAll(".info-dot").forEach((dot, dotIndex) => {
    dot.classList.toggle("is-active", dotIndex === activeInfoSlide);
  });
}

function initInfoSlider() {
  if (!infoSlides.length || !infoDotsRoot) {
    return;
  }

  infoDotsRoot.innerHTML = infoSlides.map(() => '<span class="info-dot"></span>').join("");
  showInfoSlide(0);

  window.setInterval(() => {
    showInfoSlide(activeInfoSlide + 1);
  }, 6000);
}

async function initGalleries() {
  galleryRoot.innerHTML = '<p class="loading gallery-loading">Loading galleries...</p>';

  try {
    const driveGalleries = await loadDriveGalleries();
    const galleries = driveGalleries.length ? driveGalleries : await loadLocalGalleries();

    if (!galleries.length) {
      galleryRoot.innerHTML = '<p class="loading gallery-loading">No galleries found yet.</p>';
      return;
    }

    renderMenu(galleries);
    renderGallerySections(galleries);
    scrollToActiveSection();
  } catch (error) {
    const galleries = await loadLocalGalleries();
    renderMenu(galleries);
    renderGallerySections(galleries);
    scrollToActiveSection();
  }
}

window.addEventListener("hashchange", scrollToActiveSection);
initHeroMessages();
initInfoSlider();
initGalleries();
