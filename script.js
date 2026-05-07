const STORAGE_KEY = "grandmas-pattern-organizer-items";

const locations = [
  ...Array.from({ length: 10 }, (_, index) => `Box ${index + 1}`),
  ...Array.from({ length: 10 }, (_, index) => `Notebook ${index + 1}`),
];

const state = {
  patterns: loadPatterns(),
  uploadedImage: "",
};

const refs = {
  patternGrid: document.getElementById("patternGrid"),
  resultsCount: document.getElementById("resultsCount"),
  saveStatus: document.getElementById("saveStatus"),
  searchInput: document.getElementById("searchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  sizeFilter: document.getElementById("sizeFilter"),
  locationFilter: document.getElementById("locationFilter"),
  openAddModal: document.getElementById("openAddModal"),
  addPatternModal: document.getElementById("addPatternModal"),
  imageModal: document.getElementById("imageModal"),
  fullImage: document.getElementById("fullImage"),
  patternForm: document.getElementById("patternForm"),
  imageInput: document.getElementById("imageInput"),
  uploadPreview: document.getElementById("uploadPreview"),
  nameInput: document.getElementById("nameInput"),
  yardsInput: document.getElementById("yardsInput"),
  sizeInput: document.getElementById("sizeInput"),
  locationInput: document.getElementById("locationInput"),
  categoryInput: document.getElementById("categoryInput"),
  patternCardTemplate: document.getElementById("patternCardTemplate"),
};

populateLocationSelect(refs.locationFilter, true);
populateLocationSelect(refs.locationInput, false);
bindEvents();
renderPatterns();

function bindEvents() {
  refs.searchInput.addEventListener("input", renderPatterns);
  refs.categoryFilter.addEventListener("change", renderPatterns);
  refs.sizeFilter.addEventListener("change", renderPatterns);
  refs.locationFilter.addEventListener("change", renderPatterns);
  refs.openAddModal.addEventListener("click", () => openModal(refs.addPatternModal));
  refs.patternForm.addEventListener("submit", handlePatternSubmit);
  refs.imageInput.addEventListener("change", handleImageUpload);

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      const modalId = button.getAttribute("data-close-modal");
      closeModal(document.getElementById(modalId));
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal(refs.addPatternModal);
      closeModal(refs.imageModal);
    }
  });
}

function handlePatternSubmit(event) {
  event.preventDefault();

  const pattern = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name: refs.nameInput.value.trim(),
    yards: Number(refs.yardsInput.value),
    size: refs.sizeInput.value,
    location: refs.locationInput.value,
    category: refs.categoryInput.value,
    image: state.uploadedImage,
    createdAt: Date.now(),
  };

  state.patterns.unshift(pattern);
  persistPatterns();
  refs.patternForm.reset();
  state.uploadedImage = "";
  resetUploadPreview();
  closeModal(refs.addPatternModal);
  renderPatterns();
  updateSaveStatus(`Saved "${pattern.name}" on this device.`);
}

function handleImageUpload(event) {
  const [file] = event.target.files;

  if (!file) {
    state.uploadedImage = "";
    resetUploadPreview();
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    state.uploadedImage = reader.result;
    refs.uploadPreview.innerHTML = `<img src="${reader.result}" alt="Pattern upload preview">`;
  };
  reader.readAsDataURL(file);
}

function renderPatterns() {
  const filteredPatterns = state.patterns.filter((pattern) => {
    const searchValue = refs.searchInput.value.trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      pattern.name.toLowerCase().includes(searchValue) ||
      pattern.category.toLowerCase().includes(searchValue) ||
      pattern.location.toLowerCase().includes(searchValue);

    const matchesCategory =
      refs.categoryFilter.value === "all" || pattern.category === refs.categoryFilter.value;

    const matchesSize = refs.sizeFilter.value === "all" || pattern.size === refs.sizeFilter.value;
    const matchesLocation =
      refs.locationFilter.value === "all" || pattern.location === refs.locationFilter.value;

    return matchesSearch && matchesCategory && matchesSize && matchesLocation;
  });

  refs.resultsCount.textContent = `${filteredPatterns.length} pattern${filteredPatterns.length === 1 ? "" : "s"}`;
  refs.patternGrid.innerHTML = "";

  if (!filteredPatterns.length) {
    refs.patternGrid.append(createEmptyState());
    return;
  }

  filteredPatterns.forEach((pattern) => {
    const fragment = refs.patternCardTemplate.content.cloneNode(true);
    const imageButton = fragment.querySelector(".image-frame");
    const image = fragment.querySelector(".pattern-image");

    image.src = pattern.image || createPlaceholderImage(pattern.category);
    image.alt = `${pattern.name} pattern`;
    imageButton.addEventListener("click", () => openImagePreview(pattern));

    fragment.querySelector(".pattern-badge").textContent = titleCase(pattern.category);
    fragment.querySelector(".pattern-size").textContent = titleCase(pattern.size);
    fragment.querySelector(".pattern-name").textContent = pattern.name;
    fragment.querySelector(".pattern-yards").textContent = `${trimYards(pattern.yards)} yards`;
    fragment.querySelector(".pattern-location").textContent = pattern.location;
    fragment.querySelector(".delete-button").addEventListener("click", () => deletePattern(pattern.id));

    refs.patternGrid.append(fragment);
  });
}

function createEmptyState() {
  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";
  emptyState.innerHTML = `
    <p class="section-label">Ready to organize</p>
    <h3>No patterns match your search yet</h3>
    <p>Add your first pattern with the plus button, or adjust your filters to see more of your collection.</p>
  `;
  return emptyState;
}

function openImagePreview(pattern) {
  refs.fullImage.src = pattern.image || createPlaceholderImage(pattern.category);
  refs.fullImage.alt = `${pattern.name} full-size pattern preview`;
  openModal(refs.imageModal);
}

function openModal(modal) {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function populateLocationSelect(select, includeAllOption) {
  const options = includeAllOption ? [`<option value="all">All locations</option>`] : [`<option value="" selected disabled>Choose a location</option>`];

  options.push(...locations.map((location) => `<option value="${location}">${location}</option>`));
  select.innerHTML = options.join("");
}

function resetUploadPreview() {
  refs.uploadPreview.innerHTML = `<div class="upload-placeholder">Photo preview will show here</div>`;
}

function persistPatterns() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.patterns));
}

function deletePattern(patternId) {
  const pattern = state.patterns.find((item) => item.id === patternId);

  if (!pattern) {
    return;
  }

  const confirmed = window.confirm(`Delete "${pattern.name}" from your pattern library?`);
  if (!confirmed) {
    return;
  }

  state.patterns = state.patterns.filter((item) => item.id !== patternId);
  persistPatterns();
  renderPatterns();
  updateSaveStatus(`Deleted "${pattern.name}". Changes saved on this device.`);
}

function loadPatterns() {
  try {
    const savedPatterns = localStorage.getItem(STORAGE_KEY);
    return savedPatterns ? JSON.parse(savedPatterns) : [];
  } catch {
    return [];
  }
}

function updateSaveStatus(message) {
  refs.saveStatus.textContent = message;
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function trimYards(value) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, "");
}

function createPlaceholderImage(category) {
  const label = encodeURIComponent(`${titleCase(category)} Pattern`);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#f0dcc0" />
          <stop offset="100%" stop-color="#c6d9c0" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#g)" rx="40" />
      <g opacity="0.28">
        <circle cx="130" cy="150" r="84" fill="#b8573b" />
        <circle cx="660" cy="130" r="98" fill="#d78b2d" />
        <circle cx="640" cy="460" r="120" fill="#6f8b6f" />
      </g>
      <text x="50%" y="48%" text-anchor="middle" fill="#36261c" font-family="Georgia, serif" font-size="48" font-weight="700">${decodeURIComponent(label)}</text>
      <text x="50%" y="58%" text-anchor="middle" fill="#725948" font-family="Arial, sans-serif" font-size="26">Add a photo to replace this placeholder</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
