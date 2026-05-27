import { createPianoEngine, MODES } from "./piano.js";
import { LAYOUTS, applyLayout, buildKeyboard, getElementByNote, getNoteByKey } from "./keyboard.js";

const keyboardEl = document.getElementById("keyboard");
const modeSelectEl = document.getElementById("modeSelect");
const layoutSelectEl = document.getElementById("layoutSelect");
const modeNameEl = document.getElementById("modeName");
const lastKeyEl = document.getElementById("lastKey");
const lastNoteEl = document.getElementById("lastNote");
const volumeSliderEl = document.getElementById("volumeSlider");
const volumeValueEl = document.getElementById("volumeValue");
const sustainToggleEl = document.getElementById("sustainToggle");
const sustainStatusEl = document.getElementById("sustainStatus");
const layoutHintEl = document.getElementById("layoutHint");

const STORAGE_KEYS = {
  mode: "keypiano.mode",
  layout: "keypiano.layout",
  volume: "keypiano.volume",
  sustain: "keypiano.sustain",
};

let selectedLayout = "abnt2";
const piano = createPianoEngine();

function safeReadStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWriteStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage write errors
  }
}

function updateSustainStatus(enabled) {
  sustainStatusEl.textContent = enabled ? "On" : "Off";
}

function updateVolumeLabel(value) {
  volumeValueEl.textContent = `${Math.round(value * 100)}%`;
}

function onKeyStart(rawKey) {
  const entry = getNoteByKey(rawKey);
  if (!entry) {
    return;
  }

  const result = piano.triggerDown(rawKey, entry);
  if (!result) {
    return;
  }

  const keyEl = getElementByNote(result.note);
  if (keyEl) {
    keyEl.classList.add("active", "holding");
    keyEl.setAttribute("aria-pressed", "true");
  }

  lastKeyEl.textContent = result.key;
  lastNoteEl.textContent = result.note;
  modeNameEl.textContent = result.modeLabel;
}

function onKeyEnd(rawKey) {
  const result = piano.triggerUp(rawKey);
  if (!result) {
    return;
  }

  const keyEl = getElementByNote(result.note);
  if (!keyEl) {
    return;
  }

  keyEl.classList.remove("holding");
  if (result.sustained) {
    return;
  }

  keyEl.setAttribute("aria-pressed", "false");
  window.setTimeout(() => {
    keyEl.classList.remove("active");
  }, 100);
}

function loadPreferences() {
  const savedMode = safeReadStorage(STORAGE_KEYS.mode);
  if (savedMode && MODES[savedMode]) {
    modeSelectEl.value = savedMode;
    piano.setMode(savedMode);
  }

  const savedLayout = safeReadStorage(STORAGE_KEYS.layout);
  if (savedLayout && LAYOUTS[savedLayout]) {
    selectedLayout = savedLayout;
    layoutSelectEl.value = savedLayout;
  }

  const savedVolume = Number(safeReadStorage(STORAGE_KEYS.volume));
  const normalizedVolume = Number.isFinite(savedVolume)
    ? Math.max(0, Math.min(1, savedVolume))
    : 0.75;
  volumeSliderEl.value = String(Math.round(normalizedVolume * 100));
  piano.setMasterVolume(normalizedVolume);
  updateVolumeLabel(normalizedVolume);

  const savedSustain = safeReadStorage(STORAGE_KEYS.sustain) === "1";
  sustainToggleEl.checked = savedSustain;
  piano.setSustainEnabled(savedSustain);
  updateSustainStatus(savedSustain);
}

buildKeyboard(keyboardEl, onKeyStart, onKeyEnd);
loadPreferences();
applyLayout(selectedLayout, layoutHintEl);
modeNameEl.textContent = MODES[modeSelectEl.value]?.label || "Piano";

modeSelectEl.addEventListener("change", (event) => {
  const modeId = event.target.value;
  piano.setMode(modeId);
  modeNameEl.textContent = MODES[modeId].label;
  safeWriteStorage(STORAGE_KEYS.mode, modeId);
});

layoutSelectEl.addEventListener("change", (event) => {
  selectedLayout = event.target.value;
  piano.releaseAll();
  document.querySelectorAll(".key.active, .key.holding").forEach((el) => {
    el.classList.remove("active", "holding");
    el.setAttribute("aria-pressed", "false");
  });
  applyLayout(selectedLayout, layoutHintEl);
  safeWriteStorage(STORAGE_KEYS.layout, selectedLayout);
});

volumeSliderEl.addEventListener("input", (event) => {
  const value = Number(event.target.value) / 100;
  const next = piano.setMasterVolume(value);
  updateVolumeLabel(next);
  safeWriteStorage(STORAGE_KEYS.volume, String(next));
});

sustainToggleEl.addEventListener("change", (event) => {
  const enabled = piano.setSustainEnabled(event.target.checked);
  updateSustainStatus(enabled);
  safeWriteStorage(STORAGE_KEYS.sustain, enabled ? "1" : "0");
});

window.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }
  onKeyStart(event.key);
});

window.addEventListener("keyup", (event) => {
  onKeyEnd(event.key);
});

window.addEventListener("blur", () => {
  piano.releaseAll();
  document.querySelectorAll(".key.active, .key.holding").forEach((el) => {
    el.classList.remove("active", "holding");
    el.setAttribute("aria-pressed", "false");
  });
});

if (!LAYOUTS[selectedLayout]) {
  selectedLayout = "abnt2";
  layoutSelectEl.value = selectedLayout;
  applyLayout(selectedLayout, layoutHintEl);
}
