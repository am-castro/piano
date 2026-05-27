const NOTE_DEFS = [
  { note: "C4",  freq: 261.63, type: "white" },
  { note: "C#4", freq: 277.18, type: "black" },
  { note: "D4",  freq: 293.66, type: "white" },
  { note: "D#4", freq: 311.13, type: "black" },
  { note: "E4",  freq: 329.63, type: "white" },
  { note: "F4",  freq: 349.23, type: "white" },
  { note: "F#4", freq: 369.99, type: "black" },
  { note: "G4",  freq: 392.00, type: "white" },
  { note: "G#4", freq: 415.30, type: "black" },
  { note: "A4",  freq: 440.00, type: "white" },
  { note: "A#4", freq: 466.16, type: "black" },
  { note: "B4",  freq: 493.88, type: "white" },
  { note: "C5",  freq: 523.25, type: "white" },
  { note: "C#5", freq: 554.37, type: "black" },
  { note: "D5",  freq: 587.33, type: "white" },
  { note: "D#5", freq: 622.25, type: "black" },
  { note: "E5",  freq: 659.25, type: "white" },
  { note: "F5",  freq: 698.46, type: "white" },
  { note: "F#5", freq: 739.99, type: "black" },
  { note: "G5",  freq: 783.99, type: "white" },
  { note: "G#5", freq: 830.61, type: "black" },
  { note: "A5",  freq: 880.00, type: "white" },
  { note: "A#5", freq: 932.33, type: "black" },
  { note: "B5",  freq: 987.77, type: "white" },
];

const LAYOUTS = {
  standard: {
    label: "Padrão",
    hint: "C4–B4: Z S X D C  V G B H N J M  ·  C5–B5: Q 2 W 3 E  R 5 T 6 Y 7 U",
    keys: {
      "C4": "Z",  "C#4": "S",  "D4": "X",  "D#4": "D",  "E4": "C",
      "F4": "V",  "F#4": "G",  "G4": "B",  "G#4": "H",  "A4": "N",  "A#4": "J",  "B4": "M",
      "C5": "Q",  "C#5": "2",  "D5": "W",  "D#5": "3",  "E5": "E",
      "F5": "R",  "F#5": "5",  "G5": "T",  "G#5": "6",  "A5": "Y",  "A#5": "7",  "B5": "U",
    }
  },
  alternative: {
    label: "Alternativo",
    hint: "C4–B4: A W S E D  F T G Y H U J  ·  C5–B5: K O L P ;  ' ] [ \\ = - `",
    keys: {
      "C4": "A",  "C#4": "W",  "D4": "S",  "D#4": "E",  "E4": "D",
      "F4": "F",  "F#4": "T",  "G4": "G",  "G#4": "Y",  "A4": "H",  "A#4": "U",  "B4": "J",
      "C5": "K",  "C#5": "O",  "D5": "L",  "D#5": "P",  "E5": ";",
      "F5": "'",  "F#5": "]",  "G5": "[",  "G#5": "\\", "A5": "=",  "A#5": "-",  "B5": "`",
    }
  }
};

const MODES = {
  piano: {
    label: "Piano",
    attack: 0.005,
    decay: 0.18,
    sustain: 0.0,
    release: 0.26,
    wave: "triangle",
    detune: [0, 2],
    gain: [1, 0.22],
    filter: { type: "lowpass", frequency: 3600, q: 0.6 }
  },
  organ: {
    label: "Organ",
    attack: 0.015,
    decay: 0.08,
    sustain: 0.82,
    release: 0.22,
    wave: "sine",
    detune: [0, 1200, 1902],
    gain: [0.65, 0.26, 0.09],
    filter: { type: "lowpass", frequency: 4200, q: 0.2 }
  },
  synth: {
    label: "Synth",
    attack: 0.008,
    decay: 0.12,
    sustain: 0.5,
    release: 0.2,
    wave: "sawtooth",
    detune: [0, -8, 8],
    gain: [0.65, 0.2, 0.2],
    filter: { type: "lowpass", frequency: 2400, q: 4.2 }
  },
  bell: {
    label: "Bell",
    attack: 0.001,
    decay: 1.1,
    sustain: 0.0,
    release: 0.7,
    wave: "sine",
    detune: [0, 1200, 2400],
    gain: [0.8, 0.2, 0.12],
    filter: { type: "bandpass", frequency: 2900, q: 2.4 }
  },
  bass: {
    label: "Bass",
    attack: 0.006,
    decay: 0.17,
    sustain: 0.42,
    release: 0.24,
    wave: "square",
    detune: [0, -12],
    gain: [0.78, 0.28],
    filter: { type: "lowpass", frequency: 980, q: 1.1 }
  },
  flute: {
    label: "Flute",
    attack: 0.03,
    decay: 0.15,
    sustain: 0.75,
    release: 0.45,
    wave: "triangle",
    detune: [0, 7],
    gain: [0.78, 0.08],
    filter: { type: "lowpass", frequency: 3000, q: 0.9 }
  }
};

let audioCtx;
let masterGain;
const activeVoices = new Map();
const keyToNote = new Map();
const noteToElement = new Map();
let selectedMode = "piano";
let selectedLayout = "standard";

const keyboardEl = document.getElementById("keyboard");
const modeSelectEl = document.getElementById("modeSelect");
const modeNameEl = document.getElementById("modeName");
const lastKeyEl = document.getElementById("lastKey");
const lastNoteEl = document.getElementById("lastNote");
const layoutSelectEl = document.getElementById("layoutSelect");
const layoutHintEl = document.getElementById("layoutHint");

function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.75;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function buildKeyboard() {
  const whiteOrder = ["C", "D", "E", "F", "G", "A", "B"];
  const whiteWidth = 70;

  NOTE_DEFS.forEach((entry) => {
    const keyEl = document.createElement("div");
    keyEl.className = `key ${entry.type}`;
    keyEl.dataset.note = entry.note;
    keyEl.dataset.key = "";

    const noteName = entry.note.replace("#", "♯");
    keyEl.innerHTML = `
      <div class="key-label">
        <span>${noteName}</span>
        <kbd></kbd>
      </div>
    `;

    const octave = parseInt(entry.note.slice(-1));
    const globalWhiteIdx = (octave - 4) * 7 + whiteOrder.indexOf(entry.note[0]);

    if (entry.type === "white") {
      keyEl.style.left = `${globalWhiteIdx * whiteWidth}px`;
    } else {
      keyEl.style.left = `${globalWhiteIdx * whiteWidth + 48}px`;
    }

    keyEl.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      keyEl.setPointerCapture(event.pointerId);
      triggerDown(keyEl.dataset.key);
    });

    keyEl.addEventListener("pointerup", () => {
      triggerUp(keyEl.dataset.key);
    });

    keyEl.addEventListener("pointerleave", () => {
      if (activeVoices.has(keyEl.dataset.key.toUpperCase())) {
        triggerUp(keyEl.dataset.key);
      }
    });

    keyboardEl.appendChild(keyEl);
    noteToElement.set(entry.note, keyEl);
  });
}

function applyLayout() {
  Array.from(activeVoices.keys()).forEach((key) => triggerUp(key));
  keyToNote.clear();
  const layout = LAYOUTS[selectedLayout];
  NOTE_DEFS.forEach((entry) => {
    const key = layout.keys[entry.note];
    keyToNote.set(key, entry);
    const keyEl = noteToElement.get(entry.note);
    if (keyEl) {
      keyEl.dataset.key = key;
      keyEl.querySelector("kbd").textContent = key;
    }
  });
  if (layoutHintEl) {
    layoutHintEl.textContent = layout.hint;
  }
}

function makeVoice(entry, mode) {
  const now = audioCtx.currentTime;
  const oscNodes = [];

  const filterNode = audioCtx.createBiquadFilter();
  filterNode.type = mode.filter.type;
  filterNode.frequency.value = mode.filter.frequency;
  filterNode.Q.value = mode.filter.q;

  const envelope = audioCtx.createGain();
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.linearRampToValueAtTime(1, now + mode.attack);

  if (mode.sustain > 0) {
    envelope.gain.linearRampToValueAtTime(mode.sustain, now + mode.attack + mode.decay);
  } else {
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + mode.attack + mode.decay);
  }

  mode.detune.forEach((det, idx) => {
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();

    osc.type = mode.wave;
    osc.frequency.value = entry.freq;
    osc.detune.value = det;
    oscGain.gain.value = mode.gain[idx] || 0.08;

    osc.connect(oscGain);
    oscGain.connect(filterNode);
    osc.start(now);

    oscNodes.push(osc);
  });

  filterNode.connect(envelope);
  envelope.connect(masterGain);

  return {
    oscNodes,
    envelope,
    release: mode.release,
    note: entry.note,
    pressedAt: performance.now()
  };
}

function triggerDown(rawKey) {
  ensureAudioContext();

  const key = rawKey.toUpperCase();
  const entry = keyToNote.get(key);

  if (!entry) {
    return;
  }

  if (activeVoices.has(key)) {
    return;
  }

  const mode = MODES[selectedMode];
  const voice = makeVoice(entry, mode);
  activeVoices.set(key, voice);

  const keyEl = noteToElement.get(entry.note);
  keyEl.classList.add("active", "holding");

  lastKeyEl.textContent = key;
  lastNoteEl.textContent = entry.note;
  modeNameEl.textContent = mode.label;
}

function triggerUp(rawKey) {
  if (!audioCtx) {
    return;
  }

  const key = rawKey.toUpperCase();
  const voice = activeVoices.get(key);

  if (!voice) {
    return;
  }

  const now = audioCtx.currentTime;
  const holdMs = performance.now() - voice.pressedAt;
  const extraRelease = holdMs > 650 ? 0.12 : 0;
  const releaseTime = voice.release + extraRelease;

  voice.envelope.gain.cancelScheduledValues(now);
  voice.envelope.gain.setValueAtTime(Math.max(voice.envelope.gain.value, 0.0001), now);
  voice.envelope.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

  voice.oscNodes.forEach((osc) => {
    osc.stop(now + releaseTime + 0.02);
  });

  const keyEl = noteToElement.get(voice.note);
  keyEl.classList.remove("holding");

  window.setTimeout(() => {
    keyEl.classList.remove("active");
  }, 100);

  activeVoices.delete(key);
}

window.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }
  triggerDown(event.key);
});

window.addEventListener("keyup", (event) => {
  triggerUp(event.key);
});

window.addEventListener("blur", () => {
  Array.from(activeVoices.keys()).forEach((key) => triggerUp(key));
});

modeSelectEl.addEventListener("change", (event) => {
  selectedMode = event.target.value;
  modeNameEl.textContent = MODES[selectedMode].label;
});

layoutSelectEl.addEventListener("change", (event) => {
  selectedLayout = event.target.value;
  applyLayout();
});

buildKeyboard();
applyLayout();
