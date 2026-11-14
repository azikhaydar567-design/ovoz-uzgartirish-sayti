"use strict";

/* ---------- Sozlamalar roʻyxati ---------- */
const PARAMS = [
  { k: "pitch",      n: "Ton (yarim ton)",        min: -12, max: 12,    step: 0.5,  def: 0,     u: "" },
  { k: "volume",     n: "Umumiy balandlik",       min: 0,   max: 2,     step: 0.05, def: 1,     u: "x" },
  { k: "bass",       n: "Bas (past chastota)",    min: -20, max: 20,    step: 1,    def: 0,     u: " dB" },
  { k: "mid",        n: "Oʻrta chastota",         min: -20, max: 20,    step: 1,    def: 0,     u: " dB" },
  { k: "treble",     n: "Yuqori chastota",        min: -20, max: 20,    step: 1,    def: 0,     u: " dB" },
  { k: "hp",         n: "Pastni kesish",          min: 20,  max: 2000,  step: 10,   def: 20,    u: " Hz" },
  { k: "lp",         n: "Yuqorini kesish",        min: 500, max: 20000, step: 100,  def: 20000, u: " Hz" },
  { k: "reverb",     n: "Akustika (aks-sado)",    min: 0,   max: 1,     step: 0.05, def: 0,     u: "" },
  { k: "reverbTime", n: "Xona kattaligi",         min: 0.3, max: 6,     step: 0.1,  def: 2,     u: " s" },
  { k: "echo",       n: "Exo kuchi",              min: 0,   max: 1,     step: 0.05, def: 0,     u: "" },
  { k: "echoTime",   n: "Exo oraligʻi",           min: 0.03, max: 1,    step: 0.01, def: 0.3,   u: " s" },
  { k: "dist",       n: "Buzilish (distorsiya)",  min: 0,   max: 1,     step: 0.05, def: 0,     u: "" },
  { k: "robot",      n: "Robot ovozi",            min: 0,   max: 1,     step: 0.05, def: 0,     u: "" },
  { k: "robotFreq",  n: "Robot chastotasi",       min: 20,  max: 400,   step: 5,    def: 50,    u: " Hz" },
  { k: "tremolo",    n: "Titrash",                min: 0,   max: 1,     step: 0.05, def: 0,     u: "" }
];

const PRESETS = [
  { id: "orig",   n: "Asl holat",   d: "Oʻzgarishsiz",        v: {} },
  { id: "male",   n: "Erkak",       d: "Qalin ovoz",          v: { pitch: -4, bass: 6, treble: -2 } },
  { id: "female", n: "Ayol",        d: "Ingichka ovoz",       v: { pitch: 4, treble: 3, bass: -3 } },
  { id: "kid",    n: "Bola",        d: "Juda ingichka",       v: { pitch: 8, treble: 4, bass: -6 } },
  { id: "cave",   n: "Gʻor",        d: "Katta aks-sado",      v: { reverb: 0.7, reverbTime: 4.5, echo: 0.35, echoTime: 0.35, bass: 4 } },
  { id: "alien",  n: "Oʻzga sayyoralik", d: "Titroq metall",  v: { pitch: 5, robot: 0.6, robotFreq: 60, tremolo: 0.5, reverb: 0.2, reverbTime: 1.5 } },
  { id: "robot",  n: "Robot",       d: "Mexanik ovoz",        v: { robot: 1, robotFreq: 50, echo: 0.15, echoTime: 0.03 } },
  { id: "giant",  n: "Devqomat",    d: "Chuqur va katta",     v: { pitch: -9, bass: 10, reverb: 0.3, reverbTime: 2 } },
  { id: "demon",  n: "Shayton",     d: "Qoʻrqinchli",         v: { pitch: -7, dist: 0.35, reverb: 0.4, reverbTime: 3, bass: 6 } },
  { id: "phone",  n: "Telefon",     d: "Tor diapazon",        v: { hp: 500, lp: 3000, dist: 0.1 } },
  { id: "radio",  n: "Radio",       d: "Eski radio",          v: { hp: 300, lp: 4500, dist: 0.2, mid: 4 } },
  { id: "water",  n: "Suv ostida",  d: "Boʻgʻiq ovoz",        v: { lp: 700, tremolo: 0.4, reverb: 0.3, reverbTime: 1.5 } }
];

const values = {};
let srcBuf = null, renderToken = 0, timer = null, outUrl = null, origUrl = null;
const $ = id => document.getElementById(id);

/* ---------- Interfeysni qurish ---------- */
const fmt = (p, v) => (p.step < 1 ? Number(v).toFixed(p.step < 0.1 ? 2 : 1) : v) + p.u;

PARAMS.forEach(p => {
  values[p.k] = p.def;
  const row = document.createElement("div");
  row.className = "row";
  row.innerHTML = `<label for="s_${p.k}">${p.n}<output id="o_${p.k}"></output></label>` +
    `<input type="range" id="s_${p.k}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.def}">`;
  $("sliders").appendChild(row);
  const input = row.querySelector("input");
  $("o_" + p.k).textContent = fmt(p, p.def);
  input.addEventListener("input", () => {
    values[p.k] = parseFloat(input.value);
    $("o_" + p.k).textContent = fmt(p, values[p.k]);
    setActive(null);
    schedule();
  });
});

PRESETS.forEach(pr => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "preset";
  b.dataset.id = pr.id;
  b.innerHTML = `${pr.n}<small>${pr.d}</small>`;
  b.addEventListener("click", () => { applyValues(pr.v); setActive(pr.id); schedule(0); });
  $("presets").appendChild(b);
});

function setActive(id) {
  document.querySelectorAll(".preset").forEach(b => b.classList.toggle("active", b.dataset.id === id));
}
function applyValues(v) {
  PARAMS.forEach(p => {
    const val = v[p.k] !== undefined ? v[p.k] : p.def;
    values[p.k] = val;
    $("s_" + p.k).value = val;
    $("o_" + p.k).textContent = fmt(p, val);
  });
}
$("resetBtn").addEventListener("click", () => { applyValues({}); setActive("orig"); schedule(0); });
setActive("orig");

/* ---------- Yozib olish va fayl yuklash ---------- */
let recorder = null, stream = null, chunks = [], startTime = 0, autoStop = null;

$("recBtn").addEventListener("click", async () => {
  if (recorder && recorder.state === "recording") { recorder.stop(); return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    $("status").textContent = "Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering yoki fayl yuklang.";
    return;
  }
  chunks = [];
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
  recorder.onstop = () => {
    clearInterval(timer); clearTimeout(autoStop);
    stream.getTracks().forEach(t => t.stop());
    $("recBtn").classList.remove("on");
    $("recLabel").textContent = "Qayta yozish";
    loadBlob(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
  };
  recorder.start();
  startTime = Date.now();
  $("recBtn").classList.add("on");
  $("recLabel").textContent = "Toʻxtatish";
  $("status").textContent = "Yozilmoqda… gapiring.";
  timer = setInterval(() => {
    const s = Math.floor((Date.now() - startTime) / 1000);
    $("timer").textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }, 250);
  autoStop = setTimeout(() => recorder.state === "recording" && recorder.stop(), 60000);
});

$("fileInput").addEventListener("change", e => {
  const f = e.target.files[0];
  if (f) loadBlob(f);
});

async function loadBlob(blob) {
  $("status").textContent = "Ovoz tayyorlanmoqda…";
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    srcBuf = await ac.decodeAudioData(await blob.arrayBuffer());
    ac.close();
  } catch (e) {
    $("status").textContent = "Bu faylni oʻqib boʻlmadi. Boshqa audio fayl sinab koʻring.";
    return;
  }
  if (origUrl) URL.revokeObjectURL(origUrl);
  origUrl = URL.createObjectURL(blob);
  $("origAudio").src = origUrl;
  $("origWrap").hidden = false;
  $("status").textContent = "Tayyor. Pastdan effekt tanlang yoki sozlang.";
  schedule(0);
}

/* ---------- Ton oʻzgartirish (tempo saqlanadi) ---------- */
function pitchShift(input, ratio, sr) {
  const win = Math.floor(sr * 0.06), out = new Float32Array(input.length), len = input.length;
  const read = pos => {
    if (pos < 0 || pos >= len - 1) return 0;
    const i = Math.floor(pos), f = pos - i;
    return input[i] * (1 - f) + input[i + 1] * f;
  };
  for (let n = 0; n < len; n++) {
    const t = (n * (1 - ratio)) / win;
    const f1 = t - Math.floor(t), f2 = (f1 + 0.5) % 1;
    const w1 = 0.5 - 0.5 * Math.cos(2 * Math.PI * f1), w2 = 1 - w1;
    out[n] = read(n - f1 * win) * w1 + read(n - f2 * win) * w2;
  }
  return out;
}

/* ---------- Effektlar zanjiri ---------- */
function impulse(ctx, sec) {
  const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.5);
  }
  return b;
}
function distCurve(k) {
  const n = 2048, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
  return c;
}

let timerId = null;
function schedule(delay = 220) {
  clearTimeout(timerId);
  if (!srcBuf) return;
  $("resState").textContent = "Qayta ishlanmoqda…";
  timerId = setTimeout(render, delay);
}

async function render() {
  const token = ++renderToken, p = values, sr = srcBuf.sampleRate;
  const raw = srcBuf.getChannelData(0);
  const data = p.pitch === 0 ? raw : pitchShift(raw, Math.pow(2, p.pitch / 12), sr);
  await new Promise(r => setTimeout(r, 0));
  const tail = (p.reverb > 0 ? p.reverbTime : 0) + (p.echo > 0 ? 2.5 : 0);
  const ctx = new OfflineAudioContext(2, Math.ceil((data.length / sr + tail + 0.1) * sr), sr);
  const buf = ctx.createBuffer(1, data.length, sr);
  buf.copyToChannel(data, 0);
  const src = ctx.createBufferSource();
  src.buffer = buf;

  let node = src;
  const add = n => { node.connect(n); node = n; return n; };

  if (p.robot > 0) {
    const ring = ctx.createGain(); ring.gain.value = 0;
    const osc = ctx.createOscillator(); osc.frequency.value = p.robotFreq; osc.connect(ring.gain); osc.start();
    const dry = ctx.createGain(); dry.gain.value = 1 - p.robot;
    const wet = ctx.createGain(); wet.gain.value = p.robot;
    const sum = ctx.createGain();
    node.connect(dry); dry.connect(sum);
    node.connect(ring); ring.connect(wet); wet.connect(sum);
    node = sum;
  }
  if (p.dist > 0) {
    const ws = ctx.createWaveShaper(); ws.curve = distCurve(p.dist * 80); ws.oversample = "4x";
    add(ws);
  }
  const eq = (type, f, gain, q) => {
    const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f;
    if (gain !== undefined) b.gain.value = gain;
    if (q) b.Q.value = q;
    add(b);
  };
  if (p.hp > 20) eq("highpass", p.hp);
  if (p.lp < 20000) eq("lowpass", p.lp);
  if (p.bass) eq("lowshelf", 200, p.bass);
  if (p.mid) eq("peaking", 1000, p.mid, 1);
  if (p.treble) eq("highshelf", 3500, p.treble);
  if (p.tremolo > 0) {
    const g = ctx.createGain(); g.gain.value = 1 - p.tremolo / 2;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 6;
    const depth = ctx.createGain(); depth.gain.value = p.tremolo / 2;
    lfo.connect(depth); depth.connect(g.gain); lfo.start();
    add(g);
  }

  const master = ctx.createGain(); master.gain.value = p.volume;
  node.connect(master);
  if (p.reverb > 0) {
    const conv = ctx.createConvolver(); conv.buffer = impulse(ctx, p.reverbTime);
    const wet = ctx.createGain(); wet.gain.value = p.reverb * 1.5;
    node.connect(conv); conv.connect(wet); wet.connect(master);
  }
  if (p.echo > 0) {
    const del = ctx.createDelay(1.5); del.delayTime.value = p.echoTime;
    const fb = ctx.createGain(); fb.gain.value = 0.4;
    const wet = ctx.createGain(); wet.gain.value = p.echo;
    node.connect(del); del.connect(fb); fb.connect(del); del.connect(wet); wet.connect(master);
  }
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp); comp.connect(ctx.destination);

  src.start();
  const out = await ctx.startRendering();
  if (token !== renderToken) return;

  const wav = toWav(out);
  if (outUrl) URL.revokeObjectURL(outUrl);
  outUrl = URL.createObjectURL(wav);
  $("outAudio").src = outUrl;
  $("dlBtn").href = outUrl;
  $("dlBtn").hidden = false;
  $("resState").textContent = "Natija tayyor";
  $("outAudio").play().catch(() => {});
}

/* ---------- WAV faylga aylantirish ---------- */
function toWav(buf) {
  const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
  const ab = new ArrayBuffer(44 + len * ch * 2), v = new DataView(ab);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + len * ch * 2, true); w(8, "WAVEfmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true);
  v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, len * ch * 2, true);
  const d = []; for (let c = 0; c < ch; c++) d.push(buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) {
    const s = Math.max(-1, Math.min(1, d[c][i]));
    v.setInt16(o, s < 0 ? s * 32768 : s * 32767, true); o += 2;
  }
  return new Blob([ab], { type: "audio/wav" });
}
