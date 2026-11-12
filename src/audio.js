/** Original PacMac sounds and MOD music, decoded into browser audio assets. */
export const MUSIC = Object.freeze([
  {name: "'dlaczego?'", url: 'assets/music/dlaczego.ogg'},
  {name: '4aces', url: 'assets/music/4aces.ogg'},
  {name: 'UralVolga', url: 'assets/music/uralvolga.ogg'},
]);

export class AudioEngine {
  constructor() {
    this.settings = {music: true, sound: true, waka: true, volume: .65};
    this.context = null;
    this.effects = new Map();
    this.buffers = new Map();
    this.active = new Map();
    this.lastPlayed = new Map();
    this.musicIndex = -1;
    this.unlocked = false;
    this.music = new Audio();
    this.music.loop = true;
    this.music.preload = 'metadata';
    this.music.volume = this.settings.volume * .55;
    this.music.addEventListener('error', () => {
      console.warn('Could not play PacMac music:', this.music.currentSrc);
    });
  }

  async load(manifest = {}) {
    // Fetch the small sound effects ahead of the first gesture; creating/resuming
    // the audio device is left to unlock(), as required by browser autoplay rules.
    const entries = Array.isArray(manifest)
      ? manifest.map(s => [s.name, s]) : Object.entries(manifest);
    await Promise.all(entries.map(async ([name, asset]) => {
      const path = typeof asset === 'string' ? asset : asset.url;
      const url = globalThis.__PACMAC_BUNDLE__?.files[path] || path;
      if (!url) return;
      try {
        const response = await fetch(url);
        if (!response.ok) throw Error(`${response.status} ${url}`);
        this.effects.set(name, await response.arrayBuffer());
      } catch (error) {
        console.warn(`Could not load sound ${name}:`, error);
      }
    }));
  }

  unlock() {
    this.unlocked = true;
    if (!this.context) {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (Context) {
        this.context = new Context();
        this.master = this.context.createGain();
        this.master.gain.value = this.settings.volume;
        this.master.connect(this.context.destination);
        for (const [name, bytes] of this.effects) {
          this.buffers.set(name, this.context.decodeAudioData(bytes.slice(0)).catch(error => {
            console.warn(`Could not decode sound ${name}:`, error);
            return null;
          }));
        }
      }
    }
    this.context?.resume().catch(() => {});
    if (this.settings.music && this.musicIndex >= 0 && this.music.paused) {
      this.music.play().catch(() => {});
    }
  }

  setSettings(settings) {
    Object.assign(this.settings, settings);
    const volume = Math.max(0, Math.min(1, Number(this.settings.volume) || 0));
    this.settings.volume = volume;
    if (this.master) this.master.gain.setTargetAtTime(volume, this.context.currentTime, .015);
    this.music.volume = volume * .55;
    if (!this.settings.sound) {
      for (const source of this.active.values()) {
        try { source.stop(); } catch { /* already finished */ }
      }
      this.active.clear();
    }
    if (!this.settings.music) this.music.pause();
    else if (this.unlocked && this.musicIndex >= 0) this.music.play().catch(() => {});
  }

  setMusic(index) {
    if (typeof index === 'string') index = MUSIC.findIndex(t => t.name === index);
    if (!Number.isInteger(index) || index < 0 || index >= MUSIC.length) return;
    if (index !== this.musicIndex) {
      this.music.pause();
      this.musicIndex = index;
      this.music.src = globalThis.__PACMAC_BUNDLE__?.files[MUSIC[index].url] || MUSIC[index].url;
      this.music.load();
    }
    if (this.unlocked && this.settings.music) this.music.play().catch(() => {});
  }

  stopMusic() {
    this.music.pause();
    this.musicIndex = -1;
  }

  async playEffect(name) {
    if (!this.settings.sound || !this.unlocked || !this.context) return;
    const waka = name.startsWith('WakaWaka');
    if (waka && !this.settings.waka) return;
    const now = this.context.currentTime;
    // Food can be encountered on adjacent simulation ticks. Avoid restarting
    // the eating sample so often that only its attack is audible.
    if (waka && now - (this.lastPlayed.get(name) ?? -Infinity) < .105) return;
    this.lastPlayed.set(name, now);
    const buffer = await this.buffers.get(name);
    if (!buffer || !this.settings.sound) return;
    const previous = this.active.get(name);
    if (previous) {
      try { previous.stop(); } catch { /* already finished */ }
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.master);
    this.active.set(name, source);
    source.onended = () => {
      source.disconnect();
      if (this.active.get(name) === source) this.active.delete(name);
    };
    source.start();
  }
}
