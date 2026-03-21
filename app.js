const gallery = document.getElementById("gallery");
const modal = document.getElementById("playerModal");
const player = document.getElementById("player");
const typeFilters = document.getElementById("typeFilters");
const categoryFilters = document.getElementById("categoryFilters");
const searchInput = document.getElementById("searchInput");
let currentSearch = "";
function applySearch(items) {
  if (!currentSearch) return items;

  const q = currentSearch.toLowerCase();

  return items.filter(item => {
    const title = (item.title || "").toLowerCase();
    const category = (item.category || "").toLowerCase();
    const tags = (item.tags || []).join(" ").toLowerCase();

    return (
      title.includes(q) ||
      category.includes(q) ||
      tags.includes(q)
    );
  });
}
let currentHls = null;
let allItems = [];
let currentTypeFilter = "all";
let currentCategoryFilter = "all";

const sortSelect = document.getElementById("sortSelect");
let currentSort = "newest";
function sortItems(items) {
  const sorted = [...items];

  if (currentSort === "title") {
    sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  }

  if (currentSort === "duration") {
    sorted.sort((a, b) => (b.duration || 0) - (a.duration || 0));
  }

  if (currentSort === "newest") {
    // fallback sementara pakai order asli (bisa kita upgrade nanti)
    return sorted.reverse();
  }

  return sorted;
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return "";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function getBadgeText(item) {
  if (item.kind === "video") return "VIDEO";
  if (item.kind === "stream") return "STREAM";
  if (item.kind === "image") return "IMAGE";
  return item.type ? item.type.toUpperCase() : "MEDIA";
}

function getOrientationBadge(item) {
  if (!item.orientation || item.orientation === "unknown") return "";
  if (item.orientation === "portrait") return "PORTRAIT";
  if (item.orientation === "landscape") return "LANDSCAPE";
  if (item.orientation === "square") return "SQUARE";
  return item.orientation.toUpperCase();
}

function destroyHls() {
  if (currentHls) {
    currentHls.destroy();
    currentHls = null;
  }
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderGallery(items) {
  gallery.innerHTML = "";

  if (!items.length) {
    gallery.innerHTML = `<p>Tidak ada item untuk filter ini.</p>`;
    return;
  }

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "card";

    const durationText =
      item.kind === "video" && item.duration
        ? `<span class="card-duration">${formatDuration(item.duration)}</span>`
        : "";

    const categoryText = item.category
      ? `<span class="card-category">${escapeHtml(item.category)}</span>`
      : "";

    const orientationText = getOrientationBadge(item)
      ? `<span class="card-orientation">${getOrientationBadge(item)}</span>`
      : "";

    div.innerHTML = `
      <div class="thumb-wrap">
        <img src="${item.thumb}" alt="${escapeHtml(item.title)}" loading="lazy">
        <span class="card-badge">${getBadgeText(item)}</span>
        ${durationText}
      </div>
      <div class="card-body">
        <p class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</p>
        <div class="card-meta">
          ${categoryText}
          ${orientationText}
        </div>
      </div>
    `;

    div.addEventListener("click", () => openPlayer(item));
    gallery.appendChild(div);
  });
}

function buildTypeFilters() {
  const types = [
    { label: "All", value: "all" },
    { label: "Video", value: "video" },
    { label: "Stream", value: "stream" },
    { label: "Image", value: "image" }
  ];

  typeFilters.innerHTML = "";

  types.forEach(type => {
    const btn = document.createElement("button");
    btn.className = `filter-btn ${currentTypeFilter === type.value ? "active" : ""}`;
    btn.textContent = type.label;
    btn.dataset.filter = type.value;

    btn.addEventListener("click", () => {
      currentTypeFilter = type.value;
      buildTypeFilters();
      applyFilters();
    });

    typeFilters.appendChild(btn);
  });
}

function buildCategoryFilters(items) {
  const categoriesMap = new Map();

  items.forEach(item => {
    const slug = item.categorySlug || "uncategorized";
    const label = item.category || "Uncategorized";

    if (!categoriesMap.has(slug)) {
      categoriesMap.set(slug, label);
    }
  });

  categoryFilters.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = `filter-btn ${currentCategoryFilter === "all" ? "active" : ""}`;
  allBtn.textContent = "All Categories";
  allBtn.dataset.filter = "all";

  allBtn.addEventListener("click", () => {
    currentCategoryFilter = "all";
    buildCategoryFilters(allItems);
    applyFilters();
  });

  categoryFilters.appendChild(allBtn);

  Array.from(categoriesMap.entries())
    .sort((a, b) => a[1].localeCompare(b[1]))
    .forEach(([slug, label]) => {
      const btn = document.createElement("button");
      btn.className = `filter-btn ${currentCategoryFilter === slug ? "active" : ""}`;
      btn.textContent = label;
      btn.dataset.filter = slug;

      btn.addEventListener("click", () => {
        currentCategoryFilter = slug;
        buildCategoryFilters(allItems);
        applyFilters();
      });

      categoryFilters.appendChild(btn);
    });
}

function applyFilters() {
  let filtered = [...allItems];
  filtered = applySearch(filtered);

  if (currentTypeFilter !== "all") {
    filtered = filtered.filter(item => item.kind === currentTypeFilter);
  }

  if (currentCategoryFilter !== "all") {
    filtered = filtered.filter(
      item => (item.categorySlug || "uncategorized") === currentCategoryFilter
    );
  }

  const sorted = sortItems(filtered);
  renderGallery(sorted);
}

function openPlayer(item) {
  modal.classList.remove("hidden");
  destroyHls();
  player.innerHTML = "";

  if (item.sources && Array.isArray(item.sources) && item.sources.length > 0) {
    renderMultiSource(item);
    return;
  }

  renderSingle(item);
}

function renderSingle(item) {
  if (item.type === "mp4") {
    player.innerHTML = `
      <div class="video-wrapper">
        <video controls autoplay playsinline preload="metadata">
          <source src="${item.src}" type="video/mp4">
        </video>
      </div>
    `;
  } else if (item.type === "image") {
    player.innerHTML = `
      <div class="image-wrapper">
        <img src="${item.src}" alt="${escapeHtml(item.title)}">
      </div>
    `;
  } else if (item.type === "iframe") {
    player.innerHTML = `
      <div class="iframe-wrapper">
        <iframe
          src="${item.src}"
          allowfullscreen
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin">
        </iframe>
      </div>
    `;
  } else if (item.type === "m3u8") {
    player.innerHTML = `
      <div class="video-wrapper">
        <video id="hlsPlayer" controls autoplay playsinline preload="metadata"></video>
      </div>
    `;

    const video = document.getElementById("hlsPlayer");

    if (window.Hls && Hls.isSupported()) {
      currentHls = new Hls();
      currentHls.loadSource(item.src);
      currentHls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = item.src;
    } else {
      player.innerHTML = `<p>Browser tidak mendukung HLS.</p>`;
    }
  } else {
    player.innerHTML = `<p>Tipe media tidak dikenali.</p>`;
  }
}

function renderMultiSource(item) {
  player.innerHTML = `
    <div class="source-switcher" id="sourceButtons"></div>
    <div id="videoContainer"></div>
  `;

  const btnContainer = document.getElementById("sourceButtons");
  const container = document.getElementById("videoContainer");

  item.sources.forEach((source, index) => {
    const btn = document.createElement("button");
    btn.className = "source-btn";
    btn.textContent = source.label || `Source ${index + 1}`;

    btn.addEventListener("click", () => {
      document.querySelectorAll(".source-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadSource(source, container, item.title);
    });

    btnContainer.appendChild(btn);

    if (index === 0) {
      btn.classList.add("active");
      loadSource(source, container, item.title);
    }
  });
}

function loadSource(source, container, title = "") {
  destroyHls();
  container.innerHTML = "";

  if (source.type === "mp4") {
    container.innerHTML = `
      <div class="video-wrapper">
        <video controls autoplay playsinline preload="metadata">
          <source src="${source.src}" type="video/mp4">
        </video>
      </div>
    `;
  } else if (source.type === "iframe") {
    container.innerHTML = `
      <div class="iframe-wrapper">
        <iframe
          src="${source.src}"
          allowfullscreen
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin">
        </iframe>
      </div>
    `;
  } else if (source.type === "m3u8") {
    container.innerHTML = `
      <div class="video-wrapper">
        <video id="hlsPlayer" controls autoplay playsinline preload="metadata"></video>
      </div>
    `;

    const video = document.getElementById("hlsPlayer");

    if (window.Hls && Hls.isSupported()) {
      currentHls = new Hls();
      currentHls.loadSource(source.src);
      currentHls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = source.src;
    } else {
      container.innerHTML = `<p>Browser tidak mendukung HLS.</p>`;
    }
  } else if (source.type === "image") {
    container.innerHTML = `
      <div class="image-wrapper">
        <img src="${source.src}" alt="${escapeHtml(title)}">
      </div>
    `;
  } else {
    container.innerHTML = `<p>Source tidak dikenali.</p>`;
  }
}

function closePlayer() {
  modal.classList.add("hidden");
  destroyHls();
  player.innerHTML = "";
}

modal.addEventListener("click", event => {
  if (event.target === modal) {
    closePlayer();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !modal.classList.contains("hidden")) {
    closePlayer();
  }
});

fetch("data.json")
  .then(res => res.json())
  .then(data => {
    allItems = data;
    buildTypeFilters();
    buildCategoryFilters(allItems);
    applyFilters();
  })
  .catch(err => {
    console.error("Gagal load data.json:", err);
    gallery.innerHTML = `<p>Gagal memuat data gallery.</p>`;
  });
  sortSelect.addEventListener("change", () => {
  currentSort = sortSelect.value;
  applyFilters();
});
if (searchInput) {
  searchInput.addEventListener("input", e => {
    currentSearch = e.target.value.trim();
    applyFilters();
  });
}