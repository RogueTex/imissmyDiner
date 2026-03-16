const channels = [
  { id: "grill", icon: "🍳", label: "Flat Top Grill", defaultVolume: 62 },
  { id: "percolator", icon: "☕", label: "Coffee Percolator", defaultVolume: 65 },
  { id: "chatter", icon: "💬", label: "Diner Chatter", defaultVolume: 48 },
  { id: "bell", icon: "🔔", label: "Order Bell", defaultVolume: 22 },
  { id: "jukebox", icon: "🎵", label: "Jukebox", defaultVolume: 36 },
  { id: "rain", icon: "🌧️", label: "Rain on Plate Glass", defaultVolume: 18 },
  { id: "silverware", icon: "🥄", label: "Silverware & Plates", defaultVolume: 42 },
  { id: "radio", icon: "📻", label: "AM Radio Static", defaultVolume: 30 },
];

const presets = {
  earlyBird: {
    grill: 32,
    percolator: 80,
    chatter: 12,
    bell: 10,
    jukebox: 28,
    rain: 0,
    silverware: 18,
    radio: 8,
  },
  sundayRush: {
    grill: 75,
    percolator: 62,
    chatter: 80,
    bell: 46,
    jukebox: 42,
    rain: 0,
    silverware: 70,
    radio: 24,
  },
  rainyTuesday: {
    grill: 20,
    percolator: 58,
    chatter: 27,
    bell: 8,
    jukebox: 18,
    rain: 78,
    silverware: 26,
    radio: 58,
  },
};

const storageKey = "imissmydiner-settings-v1";

const mixerGrid = document.getElementById("mixerGrid");
const masterSlider = document.getElementById("masterVolume");
const powerToggle = document.getElementById("powerToggle");
const doorSign = document.getElementById("doorSign");

const settings = loadSettings();
let audioEngine;
let isPlaying = false;

renderMixer();
applyMasterToUi(settings.masterVolume);
wireControls();

function loadSettings() {
  const defaults = {
    masterVolume: 70,
    channelVolumes: Object.fromEntries(channels.map((ch) => [ch.id, ch.defaultVolume])),
  };

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      masterVolume: clamp(parsed.masterVolume ?? defaults.masterVolume),
      channelVolumes: {
        ...defaults.channelVolumes,
        ...(parsed.channelVolumes || {}),
      },
    };
  } catch {
    return defaults;
  }
}

function persistSettings() {
  localStorage.setItem(storageKey, JSON.stringify(settings));
}

function renderMixer() {
  mixerGrid.innerHTML = channels
    .map((channel) => {
      const value = clamp(settings.channelVolumes[channel.id] ?? channel.defaultVolume);
      return `
        <article class="sound-card" data-id="${channel.id}">
          <div class="sound-title">
            <span class="sound-icon">${channel.icon}</span>
            <span>${channel.label}</span>
          </div>
          <div class="slider-row">
            <input class="sound-slider" type="range" min="0" max="100" value="${value}" aria-label="${channel.label} volume" />
            <span class="percent">${value}%</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function wireControls() {
  mixerGrid.addEventListener("input", (event) => {
    if (!event.target.classList.contains("sound-slider")) return;

    const card = event.target.closest(".sound-card");
    const channelId = card.dataset.id;
    const value = clamp(Number(event.target.value));

    settings.channelVolumes[channelId] = value;
    card.querySelector(".percent").textContent = `${value}%`;
    persistSettings();

    if (audioEngine) {
      audioEngine.setChannelVolume(channelId, value / 100);
    }
  });

  masterSlider.addEventListener("input", () => {
    const value = clamp(Number(masterSlider.value));
    settings.masterVolume = value;
    persistSettings();

    if (audioEngine) {
      audioEngine.setMasterVolume(value / 100);
    }
  });

  document.querySelectorAll(".preset-btn").forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.preset));
  });

  powerToggle.addEventListener("click", togglePower);
}

function applyPreset(presetName) {
  const preset = presets[presetName];
  if (!preset) return;

  Object.entries(preset).forEach(([channelId, value]) => {
    const safe = clamp(value);
    settings.channelVolumes[channelId] = safe;

    const card = mixerGrid.querySelector(`.sound-card[data-id="${channelId}"]`);
    if (!card) return;

    const slider = card.querySelector(".sound-slider");
    const percent = card.querySelector(".percent");
    slider.value = safe;
    percent.textContent = `${safe}%`;

    if (audioEngine) {
      audioEngine.setChannelVolume(channelId, safe / 100);
    }
  });

  persistSettings();
}

async function togglePower() {
  if (!audioEngine) {
    audioEngine = new DinerAudioEngine(channels);
    await audioEngine.init();

    Object.entries(settings.channelVolumes).forEach(([channelId, value]) => {
      audioEngine.setChannelVolume(channelId, clamp(value) / 100);
    });
    audioEngine.setMasterVolume(settings.masterVolume / 100);
  }

  if (!isPlaying) {
    await audioEngine.play();
    isPlaying = true;
    powerToggle.textContent = "Closed";
    powerToggle.setAttribute("aria-pressed", "true");
    doorSign.classList.add("is-open");
  } else {
    await audioEngine.pause();
    isPlaying = false;
    powerToggle.textContent = "Open for Business";
    powerToggle.setAttribute("aria-pressed", "false");
    doorSign.classList.remove("is-open");
  }
}

function applyMasterToUi(value) {
  masterSlider.value = clamp(value);
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

class DinerAudioEngine {
  constructor(channelDefs) {
    this.channelDefs = channelDefs;
    this.context = null;
    this.masterGain = null;
    this.channels = new Map();
  }

  async init() {
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.context.destination);

    const builders = {
      grill: () => this.createGrillBuffer(12),
      percolator: () => this.createPercolatorBuffer(10),
      chatter: () => this.createChatterBuffer(14),
      bell: () => this.createBellBuffer(16),
      jukebox: () => this.createJukeboxBuffer(16),
      rain: () => this.createRainBuffer(12),
      silverware: () => this.createSilverwareBuffer(14),
      radio: () => this.createRadioBuffer(12),
    };

    this.channelDefs.forEach((def) => {
      const gain = this.context.createGain();
      gain.gain.value = def.defaultVolume / 100;
      gain.connect(this.masterGain);

      const source = this.context.createBufferSource();
      source.buffer = builders[def.id]();
      source.loop = true;
      source.connect(gain);
      source.start(0);

      this.channels.set(def.id, { source, gain });
    });

    await this.context.suspend();
  }

  async play() {
    if (this.context.state !== "running") {
      await this.context.resume();
    }
  }

  async pause() {
    if (this.context.state === "running") {
      await this.context.suspend();
    }
  }

  setMasterVolume(value) {
    const v = Math.max(0, Math.min(1, value));
    this.masterGain.gain.setTargetAtTime(v, this.context.currentTime, 0.02);
  }

  setChannelVolume(channelId, value) {
    const channel = this.channels.get(channelId);
    if (!channel) return;
    const v = Math.max(0, Math.min(1, value));
    channel.gain.gain.setTargetAtTime(v, this.context.currentTime, 0.02);
  }

  createBuffer(duration, fillFn) {
    const length = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    fillFn(data, length, this.context.sampleRate, duration);
    return buffer;
  }

  createGrillBuffer(duration) {
    return this.createBuffer(duration, (data, length, sampleRate, dur) => {
      let prev = 0;
      const popEvents = randomEvents(dur, 1.8, 3.2).map((t) => ({ t, freq: 120 + Math.random() * 140 }));

      for (let i = 0; i < length; i += 1) {
        const t = i / sampleRate;
        const n = Math.random() * 2 - 1;
        const hp = n - prev * 0.985;
        prev = n;
        const simmer = 0.24 + 0.08 * Math.sin(2 * Math.PI * 0.35 * t);
        let sample = hp * simmer * 0.25;

        popEvents.forEach((e) => {
          const dt = t - e.t;
          if (dt > 0 && dt < 0.09) {
            sample += Math.exp(-dt * 45) * Math.sin(2 * Math.PI * e.freq * dt) * 0.38;
          }
        });

        data[i] = softClip(sample);
      }
    });
  }

  createPercolatorBuffer(duration) {
    return this.createBuffer(duration, (data, length, sampleRate, dur) => {
      const events = randomEvents(dur, 3.5, 6.5).map((t) => ({
        t,
        freq: 260 + Math.random() * 380,
        width: 0.018 + Math.random() * 0.02,
      }));

      for (let i = 0; i < length; i += 1) {
        const t = i / sampleRate;
        let sample = 0.03 * Math.sin(2 * Math.PI * 64 * t);

        events.forEach((e) => {
          const dt = t - e.t;
          if (dt > 0 && dt < 0.15) {
            const env = Math.exp(-Math.pow(dt / e.width, 2));
            sample += env * Math.sin(2 * Math.PI * e.freq * dt) * 0.24;
          }
        });

        data[i] = softClip(sample);
      }
    });
  }

  createChatterBuffer(duration) {
    return this.createBuffer(duration, (data, length, sampleRate) => {
      let smoothNoise = 0;
      const murmurFreqs = [172, 211, 243, 285, 329];

      for (let i = 0; i < length; i += 1) {
        const t = i / sampleRate;
        const n = Math.random() * 2 - 1;
        smoothNoise = smoothNoise * 0.994 + n * 0.006;
        let formants = 0;

        murmurFreqs.forEach((f, idx) => {
          formants += Math.sin(2 * Math.PI * (f + idx * 7) * t + idx) * (0.009 + 0.004 * Math.sin(t * (0.7 + idx * 0.2)));
        });

        const rhythm = 0.55 + 0.45 * (Math.sin(2 * Math.PI * 0.17 * t) * 0.5 + 0.5);
        data[i] = softClip((smoothNoise * 0.42 + formants) * rhythm);
      }
    });
  }

  createBellBuffer(duration) {
    return this.createBuffer(duration, (data, length, sampleRate, dur) => {
      const dingTimes = randomEvents(dur, 0.2, 0.45);
      for (let i = 0; i < length; i += 1) {
        const t = i / sampleRate;
        let sample = 0;

        dingTimes.forEach((time) => {
          const dt = t - time;
          if (dt > 0 && dt < 2.2) {
            const env = Math.exp(-dt * 4.7);
            sample += env * (Math.sin(2 * Math.PI * 1046 * dt) + 0.5 * Math.sin(2 * Math.PI * 1568 * dt));
          }
        });

        data[i] = sample * 0.18;
      }
    });
  }

  createJukeboxBuffer(duration) {
    return this.createBuffer(duration, (data, length, sampleRate, dur) => {
      const bpm = 94;
      const beatDur = 60 / bpm;
      const chords = [
        [196, 247, 294],
        [220, 262, 330],
        [174, 220, 262],
        [196, 247, 311],
      ];

      for (let i = 0; i < length; i += 1) {
        const t = i / sampleRate;
        const beat = Math.floor(t / beatDur) % 16;
        const chord = chords[Math.floor(beat / 4) % chords.length];
        const inBeat = (t % beatDur) / beatDur;
        const swing = inBeat < 0.58 ? 1 : 0.73;
        const wow = 1 + 0.003 * Math.sin(2 * Math.PI * 0.8 * t);

        let sample = 0;
        chord.forEach((f, idx) => {
          sample += Math.sin(2 * Math.PI * f * wow * t + idx) * (0.046 - idx * 0.009);
        });

        const bass = Math.sin(2 * Math.PI * (chord[0] / 2) * t) * 0.06;
        const crackle = (Math.random() * 2 - 1) * 0.012;
        data[i] = softClip((sample * swing + bass + crackle) * 0.9);
      }
    });
  }

  createRainBuffer(duration) {
    return this.createBuffer(duration, (data, length, sampleRate, dur) => {
      const drops = randomEvents(dur, 10, 18).map((t) => ({ t, w: 0.014 + Math.random() * 0.018 }));
      let lp = 0;

      for (let i = 0; i < length; i += 1) {
        const t = i / sampleRate;
        const n = Math.random() * 2 - 1;
        lp = lp * 0.96 + n * 0.04;
        let sample = lp * 0.15;

        drops.forEach((d) => {
          const dt = t - d.t;
          if (dt > 0 && dt < 0.16) {
            const env = Math.exp(-Math.pow(dt / d.w, 2));
            sample += env * (Math.random() * 2 - 1) * 0.22;
          }
        });

        data[i] = softClip(sample);
      }
    });
  }

  createSilverwareBuffer(duration) {
    return this.createBuffer(duration, (data, length, sampleRate, dur) => {
      const clinks = randomEvents(dur, 2.5, 4.4).map((t) => ({
        t,
        f1: 1600 + Math.random() * 700,
        f2: 2400 + Math.random() * 1100,
      }));

      for (let i = 0; i < length; i += 1) {
        const t = i / sampleRate;
        let sample = 0;
        clinks.forEach((c) => {
          const dt = t - c.t;
          if (dt > 0 && dt < 0.3) {
            const env = Math.exp(-dt * 19);
            sample += env * (Math.sin(2 * Math.PI * c.f1 * dt) + 0.7 * Math.sin(2 * Math.PI * c.f2 * dt));
          }
        });
        data[i] = sample * 0.14;
      }
    });
  }

  createRadioBuffer(duration) {
    return this.createBuffer(duration, (data, length, sampleRate) => {
      let lp = 0;
      const voiceBands = [220, 270, 330, 410, 520];

      for (let i = 0; i < length; i += 1) {
        const t = i / sampleRate;
        const n = Math.random() * 2 - 1;
        lp = lp * 0.95 + n * 0.05;
        const staticBed = lp * 0.18;

        let fauxVoice = 0;
        voiceBands.forEach((f, idx) => {
          fauxVoice += Math.sin(2 * Math.PI * f * t + idx * 1.3) * (0.012 + 0.006 * Math.sin(2 * Math.PI * (0.23 + idx * 0.05) * t));
        });

        const wobble = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.31 * t + 1.2);
        data[i] = softClip((staticBed + fauxVoice) * (0.6 + wobble * 0.4));
      }
    });
  }
}

function randomEvents(duration, minRate, maxRate) {
  const count = Math.floor(minRate + Math.random() * (maxRate - minRate));
  const events = [];
  for (let i = 0; i < count; i += 1) {
    events.push(Math.random() * duration);
  }
  return events.sort((a, b) => a - b);
}

function softClip(x) {
  return Math.tanh(x * 1.3) * 0.85;
}
