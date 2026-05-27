export const NOTE_DEFS = [
  { note: "C4", freq: 261.63, type: "white" },
  { note: "C#4", freq: 277.18, type: "black" },
  { note: "D4", freq: 293.66, type: "white" },
  { note: "D#4", freq: 311.13, type: "black" },
  { note: "E4", freq: 329.63, type: "white" },
  { note: "F4", freq: 349.23, type: "white" },
  { note: "F#4", freq: 369.99, type: "black" },
  { note: "G4", freq: 392.0, type: "white" },
  { note: "G#4", freq: 415.3, type: "black" },
  { note: "A4", freq: 440.0, type: "white" },
  { note: "A#4", freq: 466.16, type: "black" },
  { note: "B4", freq: 493.88, type: "white" },
  { note: "C5", freq: 523.25, type: "white" },
  { note: "C#5", freq: 554.37, type: "black" },
  { note: "D5", freq: 587.33, type: "white" },
  { note: "D#5", freq: 622.25, type: "black" },
  { note: "E5", freq: 659.25, type: "white" },
  { note: "F5", freq: 698.46, type: "white" },
  { note: "F#5", freq: 739.99, type: "black" },
  { note: "G5", freq: 783.99, type: "white" },
  { note: "G#5", freq: 830.61, type: "black" },
  { note: "A5", freq: 880.0, type: "white" },
  { note: "A#5", freq: 932.33, type: "black" },
  { note: "B5", freq: 987.77, type: "white" },
];

export const LAYOUTS = {
  abnt2: {
    label: "ABNT2",
    hint: "C4-B4: A W S E D  F T G Y H U J  |  C5-B5: K O L P ;  ' ] [ \\ = - `",
    keys: {
      "C4": "A", "C#4": "W", "D4": "S", "D#4": "E", "E4": "D",
      "F4": "F", "F#4": "T", "G4": "G", "G#4": "Y", "A4": "H", "A#4": "U", "B4": "J",
      "C5": "K", "C#5": "O", "D5": "L", "D#5": "P", "E5": ";",
      "F5": "'", "F#5": "]", "G5": "[", "G#5": "\\", "A5": "=", "A#5": "-", "B5": "`",
    },
  },
  us: {
    label: "US",
    hint: "C4-B4: Z S X D C  V G B H N J M  |  C5-B5: Q 2 W 3 E  R 5 T 6 Y 7 U",
    keys: {
      "C4": "Z", "C#4": "S", "D4": "X", "D#4": "D", "E4": "C",
      "F4": "V", "F#4": "G", "G4": "B", "G#4": "H", "A4": "N", "A#4": "J", "B4": "M",
      "C5": "Q", "C#5": "2", "D5": "W", "D#5": "3", "E5": "E",
      "F5": "R", "F#5": "5", "G5": "T", "G#5": "6", "A5": "Y", "A#5": "7", "B5": "U",
    },
  },
};

const keyToNote = new Map();
const noteToElement = new Map();

export function getNoteByKey(rawKey) {
  if (!rawKey) {
    return null;
  }
  return keyToNote.get(rawKey.toUpperCase()) || null;
}

export function getElementByNote(note) {
  return noteToElement.get(note) || null;
}

export function applyLayout(layoutId, layoutHintEl) {
  const layout = LAYOUTS[layoutId] || LAYOUTS.abnt2;
  keyToNote.clear();

  NOTE_DEFS.forEach((entry) => {
    const key = layout.keys[entry.note];
    keyToNote.set(key, entry);

    const keyEl = noteToElement.get(entry.note);
    if (keyEl) {
      keyEl.dataset.key = key;
      keyEl.querySelector("kbd").textContent = key;
      keyEl.setAttribute("aria-label", `Nota ${entry.note}, tecla ${key}`);
    }
  });

  if (layoutHintEl) {
    layoutHintEl.textContent = layout.hint;
  }
}

export function buildKeyboard(keyboardEl, onKeyDown, onKeyUp) {
  const whiteOrder = ["C", "D", "E", "F", "G", "A", "B"];
  const whiteWidth = 70;

  keyboardEl.innerHTML = "";

  NOTE_DEFS.forEach((entry) => {
    const keyEl = document.createElement("div");
    keyEl.className = `key ${entry.type}`;
    keyEl.dataset.note = entry.note;
    keyEl.dataset.key = "";
    keyEl.tabIndex = 0;
    keyEl.setAttribute("role", "button");
    keyEl.setAttribute("aria-pressed", "false");

    const noteName = entry.note.replace("#", "♯");
    keyEl.innerHTML = `
      <div class="key-label">
        <span>${noteName}</span>
        <kbd></kbd>
      </div>
    `;

    const octave = Number.parseInt(entry.note.slice(-1), 10);
    const globalWhiteIdx = (octave - 4) * 7 + whiteOrder.indexOf(entry.note[0]);

    if (entry.type === "white") {
      keyEl.style.left = `${globalWhiteIdx * whiteWidth}px`;
    } else {
      keyEl.style.left = `${globalWhiteIdx * whiteWidth + 48}px`;
    }

    keyEl.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      keyEl.setPointerCapture(event.pointerId);
      onKeyDown(keyEl.dataset.key);
    });

    keyEl.addEventListener("pointerup", () => {
      onKeyUp(keyEl.dataset.key);
    });

    keyEl.addEventListener("pointerleave", () => {
      onKeyUp(keyEl.dataset.key);
    });

    keyEl.addEventListener("keydown", (event) => {
      if (event.repeat) {
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onKeyDown(keyEl.dataset.key);
      }
    });

    keyEl.addEventListener("keyup", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onKeyUp(keyEl.dataset.key);
      }
    });

    keyboardEl.appendChild(keyEl);
    noteToElement.set(entry.note, keyEl);
  });
}
