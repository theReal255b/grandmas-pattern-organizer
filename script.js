const STORAGE_KEY = "grandmas-pattern-organizer-items";

const locations = [
  ...Array.from({ length: 10 }, (_, index) => `Box ${index + 1}`),
  ...Array.from({ length: 10 }, (_, index) => `Notebook ${index + 1}`),
];

const sizeOptions = ["small", "medium", "large", "twin", "full", "queen", "king"];

const state = {
  patterns: loadPatterns(),
  uploadedImage: "",
  editingPatternId: null,
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
  modalEyebrow: document.getElementById("modalEyebrow"),
  addPatternTitle: document.getElementById("addPatternTitle"),
  imageModal: document.getElementById("imageModal"),
  fullImage: document.getElementById("fullImage"),
  patternForm: document.getElementById("patternForm"),
  imageInput: document.getElementById("imageInput"),
  uploadPreview: document.getElementById("uploadPreview"),
  nameInput: document.getElementById("nameInput"),
  yardsInput: document.getElementById("yardsInput"),
  mainFabricInput: document.getElementById("mainFabricInput"),
  secondaryFabricInput: document.getElementById("secondaryFabricInput"),
  accentFabricInput: document.getElementById("accentFabricInput"),
  sizeInput: document.getElementById("sizeInput"),
  locationInput: document.getElementById("locationInput"),
  categoryInput: document.getElementById("categoryInput"),
  submitButton: document.getElementById("submitButton"),
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
  refs.openAddModal.addEventListener("click", openNewPatternModal);
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

  const selectedSizes = getSelectedSizes();

  if (!selectedSizes.length) {
    updateSaveStatus("Choose at least one size before saving.");
    return;
  }

  const existingPattern = state.patterns.find((item) => item.id === state.editingPatternId);
  const pattern = {
    id: existingPattern?.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    name: refs.nameInput.value.trim(),
    yards: Number(refs.yardsInput.value),
    fabrics: {
      main: parseOptionalNumber(refs.mainFabricInput.value),
      secondary: parseOptionalNumber(refs.secondaryFabricInput.value),
      accent: parseOptionalNumber(refs.accentFabricInput.value),
    },
    sizes: selectedSizes,
    location: refs.locationInput.value,
    category: refs.categoryInput.value,
    image: state.uploadedImage || existingPattern?.image || "",
    createdAt: existingPattern?.createdAt || Date.now(),
  };

  if (existingPattern) {
    state.patterns = state.patterns.map((item) => (item.id === existingPattern.id ? pattern : item));
  } else {
    state.patterns.unshift(pattern);
  }

  persistPatterns();
  resetFormState();
  closeModal(refs.addPatternModal);
  renderPatterns();
  updateSaveStatus(`${existingPattern ? "Updated" : "Saved"} "${pattern.name}" on this device.`);
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
    const patternSizes = getPatternSizes(pattern);
    const searchValue = refs.searchInput.value.trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      pattern.name.toLowerCase().includes(searchValue) ||
      pattern.category.toLowerCase().includes(searchValue) ||
      pattern.location.toLowerCase().includes(searchValue) ||
      patternSizes.some((size) => size.includes(searchValue));

    const matchesCategory =
      refs.categoryFilter.value === "all" || pattern.category === refs.categoryFilter.value;

    const matchesSize =
      refs.sizeFilter.value === "all" || patternSizes.includes(refs.sizeFilter.value);
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
    const patternSizes = getPatternSizes(pattern);
    const fabricEntries = getFabricEntries(pattern);
    const fragment = refs.patternCardTemplate.content.cloneNode(true);
    const imageButton = fragment.querySelector(".image-frame");
    const image = fragment.querySelector(".pattern-image");

    image.src = pattern.image || createPlaceholderImage(pattern.category);
    image.alt = `${pattern.name} pattern`;
    imageButton.addEventListener("click", () => openImagePreview(pattern));

    fragment.querySelector(".pattern-badge").textContent = titleCase(pattern.category);
    fragment.querySelector(".pattern-size-summary").textContent = summarizeSizes(patternSizes);
    fragment.querySelector(".pattern-name").textContent = pattern.name;
    fragment.querySelector(".pattern-sizes").textContent = `Sizes: ${patternSizes.map(titleCase).join(", ")}`;
    renderFabricList(fragment.querySelector(".pattern-fabrics"), fabricEntries);
    fragment.querySelector(".pattern-yards").textContent = `${trimYards(pattern.yards)} yards`;
    fragment.querySelector(".pattern-location").textContent = pattern.location;
    fragment.querySelector(".edit-button").addEventListener("click", () => startEditPattern(pattern.id));
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

function openNewPatternModal() {
  resetFormState();
  refs.modalEyebrow.textContent = "New Pattern";
  refs.addPatternTitle.textContent = "Add a sewing pattern";
  refs.submitButton.textContent = "Save Pattern";
  openModal(refs.addPatternModal);
}

function startEditPattern(patternId) {
  const pattern = state.patterns.find((item) => item.id === patternId);

  if (!pattern) {
    return;
  }

  state.editingPatternId = pattern.id;
  state.uploadedImage = pattern.image || "";
  refs.patternForm.reset();
  refs.nameInput.value = pattern.name;
  refs.yardsInput.value = pattern.yards;
  refs.mainFabricInput.value = pattern.fabrics.main ?? "";
  refs.secondaryFabricInput.value = pattern.fabrics.secondary ?? "";
  refs.accentFabricInput.value = pattern.fabrics.accent ?? "";
  refs.locationInput.value = pattern.location;
  refs.categoryInput.value = pattern.category;
  setSelectedSizes(getPatternSizes(pattern));
  refs.modalEyebrow.textContent = "Edit Pattern";
  refs.addPatternTitle.textContent = "Update this sewing pattern";
  refs.submitButton.textContent = "Save Changes";
  renderUploadPreview(state.uploadedImage);
  openModal(refs.addPatternModal);
}

function openModal(modal) {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  syncBodyScrollLock();
}

function closeModal(modal) {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  syncBodyScrollLock();

  if (modal === refs.addPatternModal) {
    resetFormState();
  }
}

function populateLocationSelect(select, includeAllOption) {
  const options = includeAllOption ? [`<option value="all">All locations</option>`] : [`<option value="" selected disabled>Choose a location</option>`];

  options.push(...locations.map((location) => `<option value="${location}">${location}</option>`));
  select.innerHTML = options.join("");
}

function resetUploadPreview() {
  renderUploadPreview("");
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
    return savedPatterns ? JSON.parse(savedPatterns).map(normalizePattern) : [];
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

function getSelectedSizes() {
  return Array.from(refs.sizeInput.querySelectorAll("input:checked")).map((input) => input.value);
}

function setSelectedSizes(sizes) {
  const sizeSet = new Set(sizes);
  refs.sizeInput.querySelectorAll("input").forEach((input) => {
    input.checked = sizeSet.has(input.value);
  });
}

function getPatternSizes(pattern) {
  return Array.isArray(pattern.sizes) && pattern.sizes.length
    ? pattern.sizes
    : pattern.size
      ? [pattern.size]
      : [];
}

function summarizeSizes(sizes) {
  if (sizes.length <= 2) {
    return sizes.map(titleCase).join(", ");
  }

  return `${sizes.length} sizes`;
}

function normalizePattern(pattern) {
  const sizes = getPatternSizes(pattern).filter((size) => sizeOptions.includes(size));
  const fabrics = {
    main: parseOptionalNumber(pattern.fabrics?.main),
    secondary: parseOptionalNumber(pattern.fabrics?.secondary),
    accent: parseOptionalNumber(pattern.fabrics?.accent),
  };

  return {
    ...pattern,
    fabrics,
    sizes,
  };
}

function resetFormState() {
  state.editingPatternId = null;
  state.uploadedImage = "";
  refs.patternForm.reset();
  setSelectedSizes([]);
  refs.modalEyebrow.textContent = "New Pattern";
  refs.addPatternTitle.textContent = "Add a sewing pattern";
  refs.submitButton.textContent = "Save Pattern";
  resetUploadPreview();
}

function renderUploadPreview(imageSource) {
  refs.uploadPreview.innerHTML = imageSource
    ? `<img src="${imageSource}" alt="Pattern upload preview">`
    : `<div class="upload-placeholder">Photo preview will show here</div>`;
}

function renderFabricList(container, fabricEntries) {
  if (!fabricEntries.length) {
    container.innerHTML = "";
    container.hidden = true;
    return;
  }

  container.hidden = false;
  container.innerHTML = fabricEntries
    .map(
      ([label, amount]) =>
        `<div class="pattern-fabric-item"><strong>${label}</strong><span>${trimYards(amount)} yards</span></div>`,
    )
    .join("");
}

function syncBodyScrollLock() {
  const hasOpenModal =
    refs.addPatternModal.classList.contains("open") ||
    refs.imageModal.classList.contains("open");

  document.body.classList.toggle("modal-open", hasOpenModal);
}

function trimYards(value) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, "");
}

function parseOptionalNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getFabricEntries(pattern) {
  return [
    ["Main fabric", pattern.fabrics?.main],
    ["Secondary fabric", pattern.fabrics?.secondary],
    ["Accent fabric", pattern.fabrics?.accent],
  ].filter(([, amount]) => amount !== null && amount !== undefined && amount !== 0);
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
