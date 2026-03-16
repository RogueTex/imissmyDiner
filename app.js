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
const customPresetNameInput = document.getElementById("customPresetName");
const customPresetSelect = document.getElementById("customPresetSelect");
const saveCustomPresetBtn = document.getElementById("saveCustomPreset");
const applyCustomPresetBtn = document.getElementById("applyCustomPreset");
const deleteCustomPresetBtn = document.getElementById("deleteCustomPreset");
const shortcutHelpBtn = document.getElementById("shortcutHelpBtn");
const shortcutDialog = document.getElementById("shortcutDialog");
const closeShortcutDialog = document.getElementById("closeShortcutDialog");
const creditsBtn = document.getElementById("creditsBtn");
const creditsDialog = document.getElementById("creditsDialog");
const closeCreditsDialog = document.getElementById("closeCreditsDialog");

const settings = loadSettings();
let audioEngine;
let isPlaying = false;
let previousMasterVolume = settings.masterVolume || 70;

renderMixer();
renderCustomPresets();
applyMasterToUi(settings.masterVolume);
wireControls();

function loadSettings() {
  const defaults = {
    masterVolume: 70,
    channelVolumes: Object.fromEntries(channels.map((ch) => [ch.id, ch.defaultVolume])),
    customPresets: {},
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
      customPresets: parsed.customPresets || {},
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

  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.preset));
  });

  saveCustomPresetBtn.addEventListener("click", saveCurrentAsCustomPreset);
  applyCustomPresetBtn.addEventListener("click", () => {
    applyCustomPresetByName(customPresetSelect.value);
  });
  deleteCustomPresetBtn.addEventListener("click", () => {
    deleteCustomPresetByName(customPresetSelect.value);
  });

  powerToggle.addEventListener("click", togglePower);
  shortcutHelpBtn.addEventListener("click", toggleShortcutDialog);
  closeShortcutDialog.addEventListener("click", toggleShortcutDialog);
  creditsBtn.addEventListener("click", toggleCreditsDialog);
  closeCreditsDialog.addEventListener("click", toggleCreditsDialog);
  window.addEventListener("keydown", handleKeyboardShortcuts);
}

function applyPreset(presetName) {
  const preset = presets[presetName];
  if (!preset) return;
  setMixVolumes(preset);
}

function setMixVolumes(mix) {
  Object.entries(mix).forEach(([channelId, value]) => {
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

function renderCustomPresets() {
  const names = Object.keys(settings.customPresets || {}).sort((a, b) => a.localeCompare(b));

  customPresetSelect.innerHTML = names.length
    ? names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")
    : '<option value="">No saved mixes yet</option>';

  const hasCustom = names.length > 0;
  customPresetSelect.disabled = !hasCustom;
  applyCustomPresetBtn.disabled = !hasCustom;
  deleteCustomPresetBtn.disabled = !hasCustom;
}

function saveCurrentAsCustomPreset() {
  const name = customPresetNameInput.value.trim().slice(0, 32);
  if (!name) return;

  settings.customPresets[name] = { ...settings.channelVolumes };
  persistSettings();
  renderCustomPresets();
  customPresetSelect.value = name;
  customPresetNameInput.value = "";
}

function applyCustomPresetByName(name) {
  const preset = settings.customPresets[name];
  if (!preset) return;
  setMixVolumes(preset);
}

function deleteCustomPresetByName(name) {
  if (!name || !settings.customPresets[name]) return;
  delete settings.customPresets[name];
  persistSettings();
  renderCustomPresets();
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

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function handleKeyboardShortcuts(event) {
  const target = event.target;
  const typingContext =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable;

  if (typingContext) return;

  if (event.key === " " || event.code === "Space") {
    event.preventDefault();
    togglePower();
    return;
  }

  if (event.key === "1") {
    event.preventDefault();
    applyPreset("earlyBird");
    return;
  }

  if (event.key === "2") {
    event.preventDefault();
    applyPreset("sundayRush");
    return;
  }

  if (event.key === "3") {
    event.preventDefault();
    applyPreset("rainyTuesday");
    return;
  }

  if (event.key.toLowerCase() === "m") {
    event.preventDefault();
    toggleMuteMaster();
    return;
  }

  if (event.key === "?") {
    event.preventDefault();
    toggleShortcutDialog();
    return;
  }

  if (event.key.toLowerCase() === "c") {
    event.preventDefault();
    toggleCreditsDialog();
  }
}

function toggleMuteMaster() {
  if (settings.masterVolume > 0) {
    previousMasterVolume = settings.masterVolume;
    settings.masterVolume = 0;
  } else {
    settings.masterVolume = Math.max(1, previousMasterVolume);
  }

  applyMasterToUi(settings.masterVolume);
  persistSettings();
  if (audioEngine) {
    audioEngine.setMasterVolume(settings.masterVolume / 100);
  }
}

function toggleShortcutDialog() {
  if (shortcutDialog.open) {
    shortcutDialog.close();
  } else {
    shortcutDialog.showModal();
  }
}

function toggleCreditsDialog() {
  if (creditsDialog.open) {
    creditsDialog.close();
  } else {
    creditsDialog.showModal();
  }
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
