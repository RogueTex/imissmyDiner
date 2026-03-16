const channels = [
  { id: "grill", icon: "🍳", label: "Flat Top Grill", defaultVolume: 62, src: "assets/audio/grill.ogg" },
  { id: "percolator", icon: "☕", label: "Coffee Percolator", defaultVolume: 65, src: "assets/audio/percolator.ogg" },
  { id: "chatter", icon: "💬", label: "Diner Chatter", defaultVolume: 48, src: "assets/audio/chatter.ogg" },
  { id: "bell", icon: "🔔", label: "Order Bell", defaultVolume: 22, src: "assets/audio/bell.ogg" },
  { id: "jukebox", icon: "🎵", label: "Jukebox", defaultVolume: 36, src: "assets/audio/jukebox.ogg" },
  { id: "rain", icon: "🌧️", label: "Rain on Plate Glass", defaultVolume: 18, src: "assets/audio/rain.ogg" },
  { id: "silverware", icon: "🥄", label: "Silverware & Plates", defaultVolume: 42, src: "assets/audio/silverware.ogg" },
  { id: "radio", icon: "📻", label: "AM Radio Static", defaultVolume: 30, src: "assets/audio/radio.ogg" },
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

    markUnavailableChannels(audioEngine.getUnavailableChannels());
  }

  if (!isPlaying) {
    await audioEngine.play();
    isPlaying = true;
    powerToggle.textContent = "Closed";
    powerToggle.setAttribute("aria-pressed", "true");
    doorSign.classList.add("is-open");
    doorSign.setAttribute("aria-label", "Open");
  } else {
    await audioEngine.pause();
    isPlaying = false;
    powerToggle.textContent = "Open for Business";
    powerToggle.setAttribute("aria-pressed", "false");
    doorSign.classList.remove("is-open");
    doorSign.setAttribute("aria-label", "Closed");
  }
}

function markUnavailableChannels(unavailable) {
  unavailable.forEach((channelId) => {
    const card = mixerGrid.querySelector(`.sound-card[data-id="${channelId}"]`);
    if (!card) return;
    card.classList.add("sound-card-unavailable");
    card.title = "Audio source unavailable";
  });
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

    for (const def of this.channelDefs) {
      const gain = this.context.createGain();
      gain.gain.value = def.defaultVolume / 100;
      gain.connect(this.masterGain);

      const audio = new Audio(def.src);
      audio.preload = "auto";
      audio.loop = true;
      audio.crossOrigin = "anonymous";

      let sourceNode = null;
      let available = false;

      try {
        await waitForAudioReady(audio);
        sourceNode = this.context.createMediaElementSource(audio);
        sourceNode.connect(gain);
        available = true;
      } catch {
        gain.gain.value = 0;
      }

      this.channels.set(def.id, { gain, audio, sourceNode, available });
    }

    await this.context.suspend();
  }

  getUnavailableChannels() {
    return [...this.channels.entries()].filter(([, c]) => !c.available).map(([id]) => id);
  }

  async play() {
    if (this.context.state !== "running") {
      await this.context.resume();
    }

    const starts = [];
    for (const [, channel] of this.channels) {
      if (!channel.available) continue;
      starts.push(channel.audio.play().catch(() => null));
    }
    await Promise.all(starts);
  }

  async pause() {
    for (const [, channel] of this.channels) {
      channel.audio.pause();
    }

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
}

function waitForAudioReady(audio) {
  return new Promise((resolve, reject) => {
    const onReady = () => cleanup(resolve);
    const onError = () => cleanup(() => reject(new Error("audio load failed")));
    const onTimeout = () => cleanup(() => reject(new Error("audio load timeout")));

    const cleanup = (done) => {
      clearTimeout(timeoutId);
      audio.removeEventListener("canplaythrough", onReady);
      audio.removeEventListener("loadeddata", onReady);
      audio.removeEventListener("error", onError);
      done();
    };

    const timeoutId = setTimeout(onTimeout, 12000);

    audio.addEventListener("canplaythrough", onReady, { once: true });
    audio.addEventListener("loadeddata", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });
    audio.load();
  });
}
