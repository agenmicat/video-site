const gallery = document.getElementById("gallery");
const modal = document.getElementById("playerModal");
const player = document.getElementById("player");
const filterButtons = document.querySelectorAll(".filter-btn");

let currentHls = null;
let allItems = [];

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

function destroyHls() {
  if (currentHls) {
    currentHls.destroy();
    currentHls = null;
  }
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

    div.innerHTML = `
      <div class="thumb-wrap">
        <img src="${item.thumb}" alt="${item.title}">
        <span class="card-badge">${getBadgeText(item)}</span>
        ${durationText}
      </div>
      <div class="card-body">
        <p class="card-title">${item.title}</p>
      </div>
    `;

    div.onclick = () => openPlayer(item);
    gallery.appendChild(div);
  });
}

function applyFilter(filter) {
  if (filter === "all") {
    renderGallery(allItems);
    return;
  }

  const filtered = allItems.filter(item => item.kind === filter);
  renderGallery(filtered);
}

function openPlayer(item) {
  modal.classList.remove("hidden");
  destroyHls();
  player.innerHTML = "";

  // support format baru: multi source
  if (item.sources && Array.isArray(item.sources) && item.sources.length > 0) {
    renderMultiSource(item);
    return;
  }

  // support format lama
  renderSingle(item);
}

function renderSingle(item) {
  if (item.type === "mp4") {
    player.innerHTML = `
      <div class="video-wrapper">
        <video controls autoplay playsinline>
          <source src="${item.src}" type="video/mp4">
        </video>
      </div>
    `;
  } else if (item.type === "image") {
    player.innerHTML = `
      <div class="image-wrapper">
        <img src="${item.src}" alt="${item.title}">
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
        <video id="hlsPlayer" controls autoplay playsinline></video>
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
        <video controls autoplay playsinline>
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
        <video id="hlsPlayer" controls autoplay playsinline></video>
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
        <img src="${source.src}" alt="${title}">
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

fetch("data.json")
  .then(res => res.json())
  .then(data => {
    allItems = data;
    renderGallery(allItems);
  })
  .catch(err => {
    console.error("Gagal load data.json:", err);
    gallery.innerHTML = `<p>Gagal memuat data gallery.</p>`;
  });

filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    applyFilter(btn.dataset.filter);
  });
});