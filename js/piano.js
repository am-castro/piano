export const MODES = {
  piano: {
    label: "Piano",
    attack: 0.005,
    decay: 0.18,
    sustain: 0.0,
    release: 0.26,
    wave: "triangle",
    detune: [0, 2],
    gain: [1, 0.22],
    filter: { type: "lowpass", frequency: 3600, q: 0.6 },
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
    filter: { type: "lowpass", frequency: 4200, q: 0.2 },
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
    filter: { type: "lowpass", frequency: 2400, q: 4.2 },
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
    filter: { type: "bandpass", frequency: 2900, q: 2.4 },
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
    filter: { type: "lowpass", frequency: 980, q: 1.1 },
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
    filter: { type: "lowpass", frequency: 3000, q: 0.9 },
  },
};

function makeVoice(audioCtx, masterGain, entry, mode) {
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
    pressedAt: performance.now(),
  };
}

export function createPianoEngine() {
  let audioCtx;
  let masterGain;
  const activeVoices = new Map();
  const sustainedKeys = new Set();
  let selectedMode = "piano";
  let masterVolume = 0.75;
  let sustainEnabled = false;

  function ensureAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = masterVolume;
      masterGain.connect(audioCtx.destination);
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function releaseVoiceByKey(key, releaseBoost = 0) {
    const voice = activeVoices.get(key);
    if (!voice || !audioCtx) {
      return null;
    }

    const now = audioCtx.currentTime;
    const holdMs = performance.now() - voice.pressedAt;
    const extraRelease = holdMs > 650 ? 0.12 : 0;
    const releaseTime = voice.release + extraRelease + releaseBoost;

    voice.envelope.gain.cancelScheduledValues(now);
    voice.envelope.gain.setValueAtTime(Math.max(voice.envelope.gain.value, 0.0001), now);
    voice.envelope.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

    voice.oscNodes.forEach((osc) => {
      osc.stop(now + releaseTime + 0.02);
    });

    activeVoices.delete(key);
    sustainedKeys.delete(key);
    return { key, note: voice.note };
  }

  return {
    setMode(modeId) {
      if (MODES[modeId]) {
        selectedMode = modeId;
      }
    },

    getModeLabel() {
      return MODES[selectedMode].label;
    },

    setMasterVolume(volume) {
      const next = Math.max(0, Math.min(1, Number(volume) || 0));
      masterVolume = next;
      if (masterGain) {
        masterGain.gain.setValueAtTime(masterVolume, audioCtx.currentTime);
      }
      return masterVolume;
    },

    getMasterVolume() {
      return masterVolume;
    },

    setSustainEnabled(enabled) {
      sustainEnabled = Boolean(enabled);
      if (!sustainEnabled) {
        Array.from(sustainedKeys).forEach((key) => {
          releaseVoiceByKey(key);
        });
      }
      return sustainEnabled;
    },

    getSustainEnabled() {
      return sustainEnabled;
    },

    triggerDown(rawKey, entry) {
      if (!entry || !rawKey) {
        return null;
      }

      ensureAudioContext();
      const key = rawKey.toUpperCase();
      if (sustainedKeys.has(key)) {
        releaseVoiceByKey(key, -0.08);
      }
      if (activeVoices.has(key)) {
        return null;
      }

      const mode = MODES[selectedMode];
      const voice = makeVoice(audioCtx, masterGain, entry, mode);
      activeVoices.set(key, voice);

      return { key, note: entry.note, modeLabel: mode.label };
    },

    triggerUp(rawKey) {
      if (!audioCtx || !rawKey) {
        return null;
      }

      const key = rawKey.toUpperCase();
      if (!activeVoices.has(key)) {
        return null;
      }

      if (sustainEnabled) {
        sustainedKeys.add(key);
        const voice = activeVoices.get(key);
        return { key, note: voice.note, sustained: true };
      }

      return releaseVoiceByKey(key);
    },

    releaseAll() {
      Array.from(activeVoices.keys()).forEach((key) => {
        releaseVoiceByKey(key);
      });
      sustainedKeys.clear();
    },

    isKeyActive(rawKey) {
      if (!rawKey) {
        return false;
      }
      return activeVoices.has(rawKey.toUpperCase());
    },
  };
}
