// audio.js — fully synthesised WebAudio sound: every effect and a
// 132 BPM bassline loop. Zero audio files, zero network.

let ctx = null;
let musicTimer = null;
let step = 0;

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function ensureAudio(state) {
  if (state && state.muted) return null;
  return audioCtx();
}

function tone(state, freq, dur, type = 'sine', vol = 0.15, slideTo = null, delay = 0) {
  const ac = ensureAudio(state);
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(state, dur, vol = 0.12, freq = 1200, delay = 0) {
  const ac = ensureAudio(state);
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const gain = ac.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t0);
}

const SFX = {
  pickup: (s) => tone(s, 520, 0.09, 'triangle', 0.16),
  place: (s) => { tone(s, 330, 0.08, 'triangle', 0.16); tone(s, 440, 0.1, 'triangle', 0.14, null, 0.06); },
  chop: (s) => { noise(s, 0.07, 0.2, 2400); tone(s, 180, 0.06, 'square', 0.08); },
  sizzle: (s) => noise(s, 0.5, 0.1, 4200),
  done: (s) => { tone(s, 880, 0.12, 'sine', 0.16); tone(s, 1174, 0.16, 'sine', 0.14, null, 0.1); },
  serve: (s) => { tone(s, 660, 0.1, 'triangle', 0.18); tone(s, 880, 0.1, 'triangle', 0.18, null, 0.09); tone(s, 1320, 0.18, 'triangle', 0.16, null, 0.18); },
  combo: (s) => { tone(s, 523, 0.1, 'square', 0.1); tone(s, 659, 0.1, 'square', 0.1, null, 0.08); tone(s, 784, 0.16, 'square', 0.1, null, 0.16); },
  fail: (s) => tone(s, 220, 0.25, 'sawtooth', 0.12, 140),
  burnt: (s) => { tone(s, 160, 0.3, 'sawtooth', 0.14, 90); noise(s, 0.25, 0.1, 800); },
  buy: (s) => { tone(s, 990, 0.1, 'triangle', 0.16); tone(s, 1320, 0.18, 'triangle', 0.16, null, 0.09); },
  round: (s) => { tone(s, 440, 0.12, 'triangle', 0.16); tone(s, 554, 0.12, 'triangle', 0.16, null, 0.11); tone(s, 659, 0.2, 'triangle', 0.16, null, 0.22); },
  alarm: (s) => { tone(s, 1046, 0.09, 'square', 0.09); tone(s, 1046, 0.09, 'square', 0.09, null, 0.14); },
};

export function playSfx(state, name) {
  if (!state || state.muted) return;
  const fn = SFX[name];
  if (fn) fn(state);
}

// 132 BPM bassline: a driving 8-step loop, scheduled ahead in small slices.
const BASSLINE = [55, 0, 55, 65.41, 55, 0, 82.41, 73.42]; // A1 C2 E2 D2
const HAT_EVERY = 2;

export function startMusic(state) {
  if (musicTimer) return;
  const ac = ensureAudio(state);
  if (!ac) return;
  const stepDur = 60 / 132 / 2; // eighth notes at 132 BPM
  musicTimer = setInterval(() => {
    if (!state || state.muted) return;
    const ac2 = audioCtx();
    if (!ac2) return;
    const now = ac2.currentTime;
    for (let i = 0; i < 4; i++) {
      const t = now + i * stepDur;
      const note = BASSLINE[step % BASSLINE.length];
      if (note) {
        const osc = ac2.createOscillator();
        const gain = ac2.createGain();
        osc.type = 'triangle';
        osc.frequency.value = note;
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + stepDur * 0.95);
        osc.connect(gain).connect(ac2.destination);
        osc.start(t);
        osc.stop(t + stepDur);
      }
      if (step % HAT_EVERY === 0) {
        const len = Math.floor(ac2.sampleRate * 0.03);
        const buf = ac2.createBuffer(1, len, ac2.sampleRate);
        const d = buf.getChannelData(0);
        for (let j = 0; j < len; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / len);
        const src = ac2.createBufferSource();
        src.buffer = buf;
        const g = ac2.createGain();
        g.gain.value = 0.05;
        src.connect(g).connect(ac2.destination);
        src.start(t);
      }
      step++;
    }
  }, 120);
}

export function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
}
