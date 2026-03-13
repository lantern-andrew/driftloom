import { useState, useRef, useCallback, useEffect } from "react";
import * as Tone from "tone";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/sora";

const ALL_NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const ALL_PITCHED = [];
for (let oct = 2; oct <= 6; oct++) {
  for (const n of ALL_NOTE_NAMES) {
    ALL_PITCHED.push(`${n}${oct}`);
    if (n === "C" && oct === 6) break;
  }
}
const NOTES = ALL_PITCHED;

const ROOT_NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

const SCALES = {
  "Reich Pulse":        [[0,4],[2,4],[4,3],[7,5],[9,3]],
  "Reich Open":         [[0,4],[2,4],[5,4],[7,5],[10,3]],
  "Glass":              [[0,6],[2,3],[4,5],[5,3],[7,6],[9,2],[11,2]],
  "Adams":              [[0,5],[2,3],[4,4],[5,2],[7,5],[9,3],[11,3]],
  "Riley":              [[0,5],[2,4],[5,4],[7,5],[10,4]],
  "Young":              [[0,6],[5,5],[7,6]],
  "Pärt":               [[0,8],[2,1],[4,6],[5,1],[7,7],[9,1],[11,1]],
  "Eno":                [[0,5],[2,4],[7,5],[11,4]],
  "Sakamoto":           [[0,5],[2,4],[4,3],[7,5],[11,4]],
  "Feldman":            [[0,5],[2,4],[7,4],[9,4]],
  "Xenakis":            [[0,4],[1,5],[3,2],[6,5],[7,4],[10,2]],
  "Ligeti":             [[0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2]],
  "Whole Tone":         [[0,4],[2,2],[4,2],[6,2],[8,2],[10,2]],
  "Diminished":         [[0,4],[2,1],[3,2],[5,2],[6,2],[8,2],[9,2],[11,1]],
  "Chromatic":          [[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1]],
  "12-Tone":            [[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1]],
};

function getScaleIntervals(scaleName) {
  return (SCALES[scaleName] || SCALES["Chromatic"]).map(([i]) => i);
}

const SCALE_GROUPS = {
  "Composer":    ["Reich Pulse","Reich Open","Glass","Adams","Riley","Young","Pärt","Eno","Sakamoto","Feldman","Ligeti","Xenakis"],
  "Texture":     ["Whole Tone","Diminished"],
  "Free":        ["Chromatic","12-Tone"],
};

function noteOctave(n) { return parseInt(n.match(/\d+$/)[0]); }
function notePc(n) { return n.replace(/\d+$/, ""); }

function getScaleNotes(root, scaleName, octLo = 3, octHi = 5) {
  const intervals = getScaleIntervals(scaleName);
  const rootIdx = ALL_NOTE_NAMES.indexOf(root);
  if (rootIdx === -1) return ALL_PITCHED;
  const scaleSet = new Set(intervals.map(i => ALL_NOTE_NAMES[(rootIdx + i) % 12]));
  return ALL_PITCHED.filter(n => {
    const oct = noteOctave(n);
    return scaleSet.has(notePc(n)) && oct >= octLo && oct <= octHi;
  });
}

function getWeightedPool(root, scaleName, octLo = 3, octHi = 5) {
  const scale = SCALES[scaleName] || SCALES["Chromatic"];
  const rootIdx = ALL_NOTE_NAMES.indexOf(root);
  if (rootIdx === -1) return ALL_PITCHED;
  const weightMap = {};
  for (const [interval, weight] of scale) {
    weightMap[ALL_NOTE_NAMES[(rootIdx + interval) % 12]] = weight;
  }
  const pool = [];
  for (const note of ALL_PITCHED) {
    const oct = noteOctave(note);
    if (oct < octLo || oct > octHi) continue;
    const w = weightMap[notePc(note)];
    if (w) { for (let i = 0; i < w; i++) pool.push(note); }
  }
  return pool;
}

const MAX_LINES = 8;
const MIN_RATE = 1;
const MAX_RATE = 12;
const BPM_DEFAULT = 120;
const MAX_STEPS = 16;

/* ─── TIMBRES ─── */
const TIMBRES = [
  { id: "piano",     label: "PIANO",    group: "Instrument", desc: "Hammer + string decay" },
  { id: "epiano",    label: "E.PIANO",  group: "Instrument", desc: "Electric piano, warm" },
  { id: "marimba",   label: "MARIMBA",  group: "Instrument", desc: "Wooden mallet tone" },
  { id: "vibes",     label: "VIBES",    group: "Instrument", desc: "Vibraphone shimmer" },
  { id: "strings",   label: "STRINGS",  group: "Instrument", desc: "Bowed string sustain" },
  { id: "brass",     label: "BRASS",    group: "Instrument", desc: "Warm brass swell" },
  { id: "flute",     label: "FLUTE",    group: "Instrument", desc: "Breathy, airy tone" },
  { id: "reed",      label: "REED",     group: "Instrument", desc: "Clarinet-like warmth" },
  { id: "kalimba",   label: "KALIMBA",  group: "Instrument", desc: "Thumb piano pluck" },
  { id: "guitar",    label: "GUITAR",   group: "Instrument", desc: "Nylon string pluck" },
  { id: "eguitar",   label: "E.GUITAR", group: "Instrument", desc: "Distorted electric" },
  { id: "organ",     label: "ORGAN",    group: "Instrument", desc: "Drawbar organ hum" },
  { id: "sitar",     label: "SITAR",    group: "Instrument", desc: "Metallic, buzzy string" },
  { id: "sine",      label: "SINE",     group: "Basic", desc: "Pure tone" },
  { id: "triangle",  label: "TRI",      group: "Basic", desc: "Soft, hollow" },
  { id: "square",    label: "SQR",      group: "Basic", desc: "Buzzy, hollow" },
  { id: "sawtooth",  label: "SAW",      group: "Basic", desc: "Bright, rich" },
  { id: "fm_bell",   label: "FM BELL",  group: "FM", desc: "Glassy bell tone" },
  { id: "fm_metal",  label: "METAL",    group: "FM", desc: "Metallic, inharmonic" },
  { id: "fm_bass",   label: "FM BASS",  group: "FM", desc: "Deep FM thump" },
  { id: "fm_chime",  label: "CHIME",    group: "FM", desc: "Bright chime" },
  { id: "pluck",     label: "PLUCK",    group: "Synth", desc: "Karplus-Strong string" },
  { id: "pad_wash",  label: "PAD",      group: "Synth", desc: "Soft sustained wash" },
  { id: "sub",       label: "SUB",      group: "Synth", desc: "Deep sub bass" },
  { id: "glass",     label: "GLASS",    group: "Synth", desc: "Shimmery overtones" },
  { id: "click",     label: "CLICK",    group: "Perc", desc: "Woody click" },
  { id: "noise_hat", label: "HAT",      group: "Perc", desc: "Filtered noise hit" },
  { id: "drop",      label: "DROP",     group: "Perc", desc: "Pitched drop" },
  { id: "dust",      label: "DUST",     group: "Perc", desc: "Tiny grain burst" },
];
const TIMBRE_GROUPS = ["Instrument", "Basic", "FM", "Synth", "Perc"];

function createSynthForTimbre(t) {
  switch (t) {
    // ─── Instruments (rich synthesis) ───
    case "piano": {
      // Layered: bright attack + body decay, filtered
      const synth = new Tone.Synth({
        oscillator: { type: "fmtriangle", modulationType: "square", modulationIndex: 1.5, harmonicity: 4.01 },
        envelope: { attack: 0.003, decay: 0.7, sustain: 0.05, release: 1.0 },
      });
      const filter = new Tone.Filter({ frequency: 4000, type: "lowpass", rolloff: -24 });
      synth.connect(filter);
      filter._parentSynth = synth;
      return filter;
    }
    case "epiano": {
      const synth = new Tone.FMSynth({
        harmonicity: 2.01, modulationIndex: 4,
        envelope: { attack: 0.005, decay: 1.0, sustain: 0.1, release: 1.2 },
        modulation: { type: "sine" },
        modulationEnvelope: { attack: 0.003, decay: 0.6, sustain: 0.1, release: 0.8 },
      });
      const chorus = new Tone.Vibrato({ frequency: 4.5, depth: 0.08 });
      synth.connect(chorus);
      chorus._parentSynth = synth;
      return chorus;
    }
    case "marimba": {
      // Sine with fast decay + slight FM for the woody attack
      const synth = new Tone.FMSynth({
        harmonicity: 4.0, modulationIndex: 2.5,
        envelope: { attack: 0.001, decay: 0.35, sustain: 0.0, release: 0.3 },
        modulation: { type: "sine" },
        modulationEnvelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 },
      });
      return synth;
    }
    case "vibes": {
      // Vibraphone: FM bell-like with vibrato and longer sustain
      const synth = new Tone.FMSynth({
        harmonicity: 3.99, modulationIndex: 8,
        envelope: { attack: 0.001, decay: 1.5, sustain: 0.0, release: 2.0 },
        modulation: { type: "sine" },
        modulationEnvelope: { attack: 0.01, decay: 1.0, sustain: 0, release: 1.0 },
      });
      const vib = new Tone.Vibrato({ frequency: 5, depth: 0.12 });
      synth.connect(vib);
      vib._parentSynth = synth;
      return vib;
    }
    case "strings": {
      // Detuned saws with slow attack, filtered
      const synth = new Tone.Synth({
        oscillator: { type: "fatsawtooth", spread: 20, count: 3 },
        envelope: { attack: 0.15, decay: 0.4, sustain: 0.7, release: 0.8 },
      });
      const filter = new Tone.Filter({ frequency: 2500, type: "lowpass", rolloff: -12 });
      synth.connect(filter);
      filter._parentSynth = synth;
      return filter;
    }
    case "brass": {
      // Saw with filter envelope for brass swell
      const synth = new Tone.Synth({
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.08, decay: 0.3, sustain: 0.6, release: 0.4 },
      });
      const filter = new Tone.Filter({ frequency: 800, type: "lowpass", rolloff: -24 });
      const autoFilter = new Tone.FrequencyShifter(0); // placeholder — use LFO
      synth.connect(filter);
      filter._parentSynth = synth;
      return filter;
    }
    case "flute": {
      // Sine + noise for breath, filtered
      const synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.06, decay: 0.2, sustain: 0.6, release: 0.5 },
      });
      const vib = new Tone.Vibrato({ frequency: 5.5, depth: 0.06 });
      synth.connect(vib);
      vib._parentSynth = synth;
      return vib;
    }
    case "reed": {
      // Square-ish wave, filtered for warmth, slight vibrato
      const synth = new Tone.Synth({
        oscillator: { type: "fmsquare", modulationType: "sine", modulationIndex: 0.8, harmonicity: 1.01 },
        envelope: { attack: 0.04, decay: 0.25, sustain: 0.5, release: 0.4 },
      });
      const filter = new Tone.Filter({ frequency: 1800, type: "lowpass", rolloff: -12 });
      const vib = new Tone.Vibrato({ frequency: 5, depth: 0.05 });
      synth.connect(filter);
      filter.connect(vib);
      vib._parentSynth = synth;
      vib._chain = [filter];
      return vib;
    }
    case "kalimba": {
      // Short plucky sine with harmonics
      const synth = new Tone.FMSynth({
        harmonicity: 5.01, modulationIndex: 3,
        envelope: { attack: 0.001, decay: 0.6, sustain: 0.0, release: 0.5 },
        modulation: { type: "triangle" },
        modulationEnvelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
      });
      return synth;
    }
    case "guitar": {
      // Nylon guitar: FM pluck with fast decay
      const synth = new Tone.FMSynth({
        harmonicity: 1.01, modulationIndex: 2,
        envelope: { attack: 0.002, decay: 0.5, sustain: 0.0, release: 0.4 },
        modulation: { type: "triangle" },
        modulationEnvelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.2 },
      });
      const filter = new Tone.Filter({ frequency: 2500, type: "lowpass", rolloff: -12 });
      synth.connect(filter);
      filter._parentSynth = synth;
      return filter;
    }
    case "eguitar": {
      // Electric guitar: brighter FM pluck into distortion + cab sim
      const synth = new Tone.FMSynth({
        harmonicity: 1.01, modulationIndex: 3,
        envelope: { attack: 0.001, decay: 0.6, sustain: 0.05, release: 0.5 },
        modulation: { type: "square" },
        modulationEnvelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
      });
      const dist = new Tone.Distortion({ distortion: 0.7, oversample: "2x" });
      const mid = new Tone.Filter({ frequency: 800, type: "peaking", gain: 6, Q: 1.5 });
      const cab = new Tone.Filter({ frequency: 3000, type: "lowpass", rolloff: -24 });
      synth.connect(dist);
      dist.connect(mid);
      mid.connect(cab);
      cab._parentSynth = synth;
      cab._chain = [dist, mid];
      return cab;
    }
    case "organ": {
      // Additive organ: fat sine with multiple harmonics
      const synth = new Tone.Synth({
        oscillator: { type: "fatsine", spread: 12, count: 5 },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.3 },
      });
      return synth;
    }
    case "sitar": {
      // FM with inharmonic ratio for buzzy metallic string
      const synth = new Tone.FMSynth({
        harmonicity: 1.618, modulationIndex: 12,
        envelope: { attack: 0.005, decay: 1.0, sustain: 0.05, release: 0.8 },
        modulation: { type: "sawtooth" },
        modulationEnvelope: { attack: 0.005, decay: 0.5, sustain: 0.1, release: 0.5 },
      });
      return synth;
    }
    // ─── Basic ───
    case "sine": return new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.005, decay: 0.15, sustain: 0.05, release: 0.3 } });
    case "triangle": return new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.005, decay: 0.15, sustain: 0.05, release: 0.3 } });
    case "square": return new Tone.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.03, release: 0.2 } });
    case "sawtooth": return new Tone.Synth({ oscillator: { type: "sawtooth" }, envelope: { attack: 0.005, decay: 0.12, sustain: 0.04, release: 0.25 } });
    // ─── FM ───
    case "fm_bell": return new Tone.FMSynth({ harmonicity: 3.01, modulationIndex: 14, envelope: { attack: 0.001, decay: 0.8, sustain: 0, release: 1.2 }, modulation: { type: "square" }, modulationEnvelope: { attack: 0.002, decay: 0.5, sustain: 0, release: 0.5 } });
    case "fm_metal": return new Tone.FMSynth({ harmonicity: 7.5, modulationIndex: 20, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.4 }, modulation: { type: "square" }, modulationEnvelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.3 } });
    case "fm_bass": return new Tone.FMSynth({ harmonicity: 0.5, modulationIndex: 8, envelope: { attack: 0.001, decay: 0.4, sustain: 0.1, release: 0.3 }, modulation: { type: "sine" }, modulationEnvelope: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 0.2 } });
    case "fm_chime": return new Tone.FMSynth({ harmonicity: 5.01, modulationIndex: 10, envelope: { attack: 0.001, decay: 1.2, sustain: 0, release: 1.5 }, modulation: { type: "sine" }, modulationEnvelope: { attack: 0.01, decay: 0.8, sustain: 0, release: 0.8 } });
    // ─── Synth ───
    case "pluck": return new Tone.FMSynth({ harmonicity: 2.01, modulationIndex: 2, envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.3 }, modulation: { type: "triangle" }, modulationEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 } });
    case "pad_wash": return new Tone.Synth({ oscillator: { type: "fatsine", spread: 30, count: 3 }, envelope: { attack: 0.3, decay: 0.6, sustain: 0.5, release: 1.5 } });
    case "sub": return new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.5, sustain: 0.2, release: 0.4 } });
    case "glass": return new Tone.AMSynth({ harmonicity: 3.5, oscillator: { type: "sine" }, envelope: { attack: 0.005, decay: 0.6, sustain: 0, release: 0.8 }, modulation: { type: "triangle" }, modulationEnvelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.5 } });
    // ─── Perc ───
    case "click": return new Tone.MembraneSynth({ pitchDecay: 0.008, octaves: 2, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.03 } });
    case "noise_hat": return new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.04 } });
    case "drop": return new Tone.MembraneSynth({ pitchDecay: 0.15, octaves: 6, envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.15 } });
    case "dust": return new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 } });
    default: return new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.005, decay: 0.15, sustain: 0.05, release: 0.3 } });
  }
}

// Get the triggerable synth from a node (might be chained through effects)
function getTriggerableSynth(node) {
  return node._parentSynth || node;
}

function triggerSynth(synthNode, timbreId, note, time) {
  const synth = getTriggerableSynth(synthNode);
  const isNoise = timbreId === "noise_hat" || timbreId === "dust";
  if (isNoise) synth.triggerAttackRelease("32n", time);
  else synth.triggerAttackRelease(note, "32n", time);
}

function triggerSynthWithDuration(synthNode, timbreId, note, time, durationSec) {
  const synth = getTriggerableSynth(synthNode);
  const isNoise = timbreId === "noise_hat" || timbreId === "dust";
  if (isNoise) synth.triggerAttackRelease(durationSec * 0.8, time);
  else synth.triggerAttackRelease(note, durationSec * 0.9, time);
}

const COLORS = [
  { bg: "#6BB8A0", glow: "rgba(107,184,160,0.4)" },
  { bg: "#7BA4D4", glow: "rgba(123,164,212,0.4)" },
  { bg: "#B88BD4", glow: "rgba(184,139,212,0.4)" },
  { bg: "#7BC4A8", glow: "rgba(123,196,168,0.4)" },
  { bg: "#5DBEAA", glow: "rgba(93,190,170,0.4)" },
  { bg: "#8DB4DE", glow: "rgba(141,180,222,0.4)" },
  { bg: "#A07BC4", glow: "rgba(160,123,196,0.4)" },
  { bg: "#7BC4A8", glow: "rgba(123,196,168,0.4)" },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 12-tone row: shuffled pitch classes, each must appear before any repeats
let _twelveRow = [];
let _twelveIdx = 0;
function resetTwelveRow() {
  _twelveRow = [...ALL_NOTE_NAMES].sort(() => Math.random() - 0.5);
  _twelveIdx = 0;
}
function nextTwelveToneNote(octLo = 3, octHi = 5) {
  if (_twelveIdx >= _twelveRow.length) resetTwelveRow();
  const pc = _twelveRow[_twelveIdx++];
  const oct = randomInt(octLo, octHi);
  return `${pc}${oct}`;
}
resetTwelveRow();

function randomNote(pool) {
  return pool[randomInt(0, pool.length - 1)];
}

function generateRandomSteps(weightedPool, flatPool, scaleName, octLo, octHi) {
  const isTwelveTone = scaleName === "12-Tone";
  const roll = Math.random();
  const numNotes = roll < 0.15 ? 1 : roll < 0.55 ? 2 : 3;
  const steps = [];
  for (let i = 0; i < numNotes; i++) {
    const note = isTwelveTone ? nextTwelveToneNote(octLo, octHi) : randomNote(weightedPool);
    steps.push({ note, active: true, tied: false });
  }
  if (steps.length >= 2 && flatPool.length >= 2) {
    const allSame = steps.every(s => s.note === steps[0].note);
    if (allSame) {
      const fixIdx = randomInt(1, steps.length - 1);
      let newNote = isTwelveTone ? nextTwelveToneNote(octLo, octHi) : randomNote(weightedPool);
      let tries = 0;
      while (newNote === steps[0].note && tries < 20) { newNote = isTwelveTone ? nextTwelveToneNote(octLo, octHi) : randomNote(weightedPool); tries++; }
      steps[fixIdx].note = newNote;
    }
  }
  if (steps.length >= 2 && Math.random() < 0.4) {
    const tieIdx = randomInt(1, steps.length - 1);
    const wouldBe = steps.map((s, i) => i === tieIdx ? steps[tieIdx - 1].note : s.note);
    const distinct = new Set(wouldBe).size;
    if (distinct >= 2) {
      steps[tieIdx] = { note: steps[tieIdx - 1].note, active: true, tied: true };
    }
  }
  return steps;
}

function createDefaultLine(index, root, scaleName, octLo = 3, octHi = 5, timbre = "kalimba") {
  const weightedPool = getWeightedPool(root, scaleName, octLo, octHi);
  const flatPool = getScaleNotes(root, scaleName, octLo, octHi);
  const pan = Math.round((Math.random() * 1.8 - 0.9) * 100) / 100;
  return {
    id: Date.now() + Math.random(),
    steps: generateRandomSteps(weightedPool, flatPool, scaleName, octLo, octHi),
    rate: randomInt(1, MAX_RATE),
    timbre,
    volume: -8,
    pan,
    muted: false,
  };
}

/* ─── Rate Dial ─── */
function RateDial({ value, onChange, color, size = 90 }) {
  const svgRef = useRef(null);
  const dragging = useRef(false);
  const startAngle = useRef(0);
  const startValue = useRef(0);
  const MIN_ANGLE = -135, MAX_ANGLE = 135;
  const range = MAX_RATE - MIN_RATE;
  const fraction = (value - MIN_RATE) / range;
  const angle = MIN_ANGLE + fraction * (MAX_ANGLE - MIN_ANGLE);
  const notchAngles = [];
  for (let i = Math.ceil(MIN_RATE); i <= Math.floor(MAX_RATE); i++) {
    notchAngles.push({ angle: MIN_ANGLE + ((i - MIN_RATE) / range) * (MAX_ANGLE - MIN_ANGLE), label: i });
  }
  const getAngleFromEvent = useCallback((e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const cX = e.touches ? e.touches[0].clientX : e.clientX;
    const cY = e.touches ? e.touches[0].clientY : e.clientY;
    return Math.atan2(cY - cy, cX - cx) * (180 / Math.PI);
  }, []);
  const handleStart = useCallback((e) => {
    e.preventDefault(); dragging.current = true;
    startAngle.current = getAngleFromEvent(e); startValue.current = value;
    const handleMove = (e2) => {
      if (!dragging.current) return; e2.preventDefault();
      let delta = getAngleFromEvent(e2) - startAngle.current;
      if (delta > 180) delta -= 360; if (delta < -180) delta += 360;
      let nv = startValue.current + (delta / (MAX_ANGLE - MIN_ANGLE)) * range;
      nv = Math.round(Math.max(MIN_RATE, Math.min(MAX_RATE, nv)));
      onChange(nv);
    };
    const handleEnd = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove); window.removeEventListener("touchend", handleEnd);
    };
    window.addEventListener("mousemove", handleMove); window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false }); window.addEventListener("touchend", handleEnd);
  }, [value, onChange, getAngleFromEvent]);
  const r = size / 2 - 8, notchR = r - 6, labelR = r + 14;
  return (
    <svg ref={svgRef} width={size + 30} height={size + 30}
      viewBox={`${-(size / 2 + 15)} ${-(size / 2 + 15)} ${size + 30} ${size + 30}`}
      style={{ cursor: "grab", touchAction: "none", userSelect: "none" }}
      onMouseDown={handleStart} onTouchStart={handleStart}>
      {(() => { const sA = ((MIN_ANGLE - 90) * Math.PI) / 180, eA = ((MAX_ANGLE - 90) * Math.PI) / 180; return <path d={`M ${r * Math.cos(sA)} ${r * Math.sin(sA)} A ${r} ${r} 0 1 1 ${r * Math.cos(eA)} ${r * Math.sin(eA)}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} strokeLinecap="round" />; })()}
      {(() => { const sA = ((MIN_ANGLE - 90) * Math.PI) / 180, eA = ((angle - 90) * Math.PI) / 180; return <path d={`M ${r * Math.cos(sA)} ${r * Math.sin(sA)} A ${r} ${r} 0 ${angle - MIN_ANGLE > 180 ? 1 : 0} 1 ${r * Math.cos(eA)} ${r * Math.sin(eA)}`} fill="none" stroke={color.bg} strokeWidth={4} strokeLinecap="round" opacity={0.7} />; })()}
      {notchAngles.map(({ angle: na, label }) => { const a = ((na - 90) * Math.PI) / 180; return (<g key={label}><line x1={(notchR-4)*Math.cos(a)} y1={(notchR-4)*Math.sin(a)} x2={(notchR+4)*Math.cos(a)} y2={(notchR+4)*Math.sin(a)} stroke="rgba(255,255,255,0.2)" strokeWidth={1.5}/><text x={labelR*Math.cos(a)} y={labelR*Math.sin(a)} fill="rgba(255,255,255,0.3)" fontSize={8} textAnchor="middle" dominantBaseline="central" style={{fontFamily:"'JetBrains Mono Variable',monospace"}}>{label}</text></g>); })}
      {(() => { const a = ((angle - 90) * Math.PI) / 180; const px = (r-16)*Math.cos(a), py = (r-16)*Math.sin(a); return (<><line x1={0} y1={0} x2={px} y2={py} stroke={color.bg} strokeWidth={2.5} strokeLinecap="round"/><circle cx={px} cy={py} r={4} fill={color.bg} filter={`drop-shadow(0 0 4px ${color.glow})`}/></>); })()}
      <circle cx={0} cy={0} r={18} fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.1)" strokeWidth={1}/>
      <text x={0} y={1} fill={color.bg} fontSize={12} fontWeight="bold" textAnchor="middle" dominantBaseline="central" style={{fontFamily:"'JetBrains Mono Variable',monospace"}}>{Math.round(value)}</text>
    </svg>
  );
}

/* ─── Timbre Picker ─── */
function TimbrePicker({ current, onSelect, onClose, color }) {
  return (
    <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 100, marginTop: 4, background: "#111118", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 12, minWidth: 280, boxShadow: "0 12px 40px rgba(0,0,0,0.7)" }}>
      {TIMBRE_GROUPS.map((group) => (
        <div key={group} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: 2, marginBottom: 6, paddingLeft: 4 }}>{group.toUpperCase()}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {TIMBRES.filter((t) => t.group === group).map((t) => (
              <button key={t.id} onClick={() => { onSelect(t.id); onClose(); }} title={t.desc}
                style={{ background: current === t.id ? `${color.bg}22` : "rgba(255,255,255,0.03)", border: `1px solid ${current === t.id ? `${color.bg}66` : "rgba(255,255,255,0.06)"}`, borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: current === t.id ? color.bg : "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "'JetBrains Mono Variable', monospace", transition: "all 0.15s" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Step Sequencer (melody editor) with ties + drag reorder ─── */
function StepSequencer({ steps, onChange, color, currentStep, isPercTimbre, scaleNotes }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const dragRef = useRef(null);
  const stepsRef = useRef(null);

  const addStep = () => {
    if (steps.length >= MAX_STEPS) return;
    const lastNote = steps[steps.length - 1]?.note || "C4";
    onChange([...steps, { note: lastNote, active: true, tied: false }]);
  };
  const removeStep = (i) => {
    if (steps.length <= 1) return;
    const newSteps = steps.filter((_, j) => j !== i);
    // If removing caused step 0 to be tied, untie it
    if (newSteps[0]) newSteps[0] = { ...newSteps[0], tied: false };
    onChange(newSteps);
  };
  const updateStep = (i, updates) => {
    onChange(steps.map((s, j) => j === i ? { ...s, ...updates } : s));
  };
  const toggleTie = (i) => {
    if (i === 0) return; // can't tie the first step
    const prev = steps[i - 1];
    const curr = steps[i];
    // Can only tie if same note (for pitched) or both active (for perc)
    if (!isPercTimbre && prev.note !== curr.note) return;
    updateStep(i, { tied: !curr.tied });
  };
  const canTie = (i) => {
    if (i === 0 || isPercTimbre) return false;
    return steps[i - 1]?.note === steps[i]?.note;
  };

  /* ─── Drag reorder ─── */
  const handleDragStart = (e, i) => {
    setDragIdx(i);
    dragRef.current = i;
    e.dataTransfer.effectAllowed = "move";
    // Minimal ghost
    const el = e.currentTarget;
    const ghost = el.cloneNode(true);
    ghost.style.opacity = "0.6";
    ghost.style.position = "absolute";
    ghost.style.top = "-9999px";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 26, 20);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };
  const handleDragOver = (e, i) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(i);
  };
  const handleDrop = (e, i) => {
    e.preventDefault();
    const from = dragRef.current;
    if (from === null || from === i) { setDragIdx(null); setOverIdx(null); return; }
    const newSteps = [...steps];
    const [moved] = newSteps.splice(from, 1);
    newSteps.splice(i, 0, moved);
    // Fix ties after reorder: untie first step, untie any step whose prev note differs
    newSteps.forEach((s, j) => {
      if (j === 0) s.tied = false;
      else if (s.tied && newSteps[j - 1].note !== s.note) s.tied = false;
    });
    onChange(newSteps);
    setDragIdx(null);
    setOverIdx(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
      <div ref={stepsRef} style={{ display: "flex", alignItems: "flex-start", gap: 0, flexWrap: "wrap" }}>
        {steps.map((step, i) => {
          const isDragging = dragIdx === i;
          const isOver = overIdx === i && dragIdx !== null && dragIdx !== i;
          const isTied = step.tied && i > 0;
          const nextIsTied = i < steps.length - 1 && steps[i + 1]?.tied;
          const tieConnectable = canTie(i);

          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", position: "relative" }}>
              {/* Tie connector bar (before this step) */}
              {isTied && (
                <div style={{
                  width: 8, height: 2, background: color.bg, opacity: 0.5,
                  alignSelf: "center", marginTop: 10, marginLeft: -1, marginRight: -1,
                  borderRadius: 1,
                }} />
              )}
              {/* Drop indicator */}
              {isOver && (
                <div style={{
                  position: "absolute", left: -2, top: 6, bottom: 6,
                  width: 3, background: color.bg, borderRadius: 2,
                  boxShadow: `0 0 8px ${color.glow}`, zIndex: 10,
                }} />
              )}
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  padding: "2px 3px", cursor: "grab",
                  opacity: isDragging ? 0.3 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {/* Active step highlight */}
                <div style={{
                  width: 4, height: 4, borderRadius: "50%",
                  background: currentStep === i ? color.bg : "transparent",
                  boxShadow: currentStep === i ? `0 0 6px ${color.glow}` : "none",
                  transition: "all 0.05s", marginBottom: 1,
                }} />
                {/* Note selector or toggle for perc */}
                {isPercTimbre ? (
                  <button
                    onClick={() => updateStep(i, { active: !step.active })}
                    style={{
                      width: 32, height: 32, borderRadius: 6, cursor: "pointer",
                      background: step.active ? `${color.bg}${currentStep === i ? '44' : '22'}` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${step.active ? `${color.bg}${currentStep === i ? '88' : '44'}` : "rgba(255,255,255,0.06)"}`,
                      color: step.active ? color.bg : "rgba(255,255,255,0.15)",
                      fontSize: 10, fontFamily: "'JetBrains Mono Variable', monospace", transition: "all 0.1s",
                    }}
                  >{step.active ? "●" : "○"}</button>
                ) : (
                  <select
                    value={step.note}
                    onChange={(e) => {
                      const newNote = e.target.value;
                      const updated = [...steps];
                      updated[i] = { ...updated[i], note: newNote };
                      // Auto-untie if note no longer matches neighbors
                      if (updated[i].tied && i > 0 && updated[i - 1].note !== newNote) {
                        updated[i].tied = false;
                      }
                      if (i < updated.length - 1 && updated[i + 1]?.tied && updated[i + 1].note !== newNote) {
                        updated[i + 1] = { ...updated[i + 1], tied: false };
                      }
                      onChange(updated);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: 52, height: 30, borderRadius: isTied ? "2px 5px 5px 2px" : nextIsTied ? "5px 2px 2px 5px" : 5,
                      cursor: "pointer",
                      background: isTied
                        ? `${color.bg}${currentStep === i ? '33' : '15'}`
                        : currentStep === i ? `${color.bg}22` : "rgba(255,255,255,0.04)",
                      borderTop: `1px solid ${isTied ? `${color.bg}55` : currentStep === i ? `${color.bg}66` : "rgba(255,255,255,0.08)"}`,
                      borderRight: `1px solid ${isTied ? `${color.bg}55` : currentStep === i ? `${color.bg}66` : "rgba(255,255,255,0.08)"}`,
                      borderBottom: `1px solid ${isTied ? `${color.bg}55` : currentStep === i ? `${color.bg}66` : "rgba(255,255,255,0.08)"}`,
                      borderLeft: `1px solid ${isTied ? `${color.bg}33` : currentStep === i ? `${color.bg}66` : "rgba(255,255,255,0.08)"}`,
                      color: currentStep === i ? color.bg : isTied ? `${color.bg}aa` : "rgba(255,255,255,0.5)",
                      fontSize: 10, fontFamily: "'JetBrains Mono Variable', monospace",
                      outline: "none", textAlign: "center", padding: "0 2px", transition: "all 0.1s",
                    }}
                  >
                    {(scaleNotes || NOTES).map((n) => <option key={n} value={n} style={{ background: "#0a0a0f", color: "#ddd" }}>{n}</option>)}
                  </select>
                )}
                {/* Tie + Remove row */}
                <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                  {/* Tie toggle */}
                  {!isPercTimbre && i > 0 && (
                    <button
                      onClick={() => toggleTie(i)}
                      title={isTied ? "Untie from previous" : tieConnectable ? "Tie to previous (same note)" : "Set same note to tie"}
                      style={{
                        width: 16, height: 14, borderRadius: 3, border: "none",
                        background: isTied ? `${color.bg}33` : "transparent",
                        color: isTied ? color.bg : tieConnectable ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)",
                        fontSize: 9, cursor: tieConnectable || isTied ? "pointer" : "default",
                        padding: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "'JetBrains Mono Variable', monospace",
                      }}
                    >⌒</button>
                  )}
                  {/* Remove step */}
                  {steps.length > 1 && (
                    <button onClick={() => removeStep(i)}
                      style={{
                        width: 14, height: 14, borderRadius: "50%", border: "none",
                        background: "transparent", color: "rgba(255,255,255,0.12)",
                        fontSize: 8, cursor: "pointer", padding: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >✕</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {/* Add step */}
        {steps.length < MAX_STEPS && (
          <div style={{ padding: "2px 3px", display: "flex", alignItems: "flex-start", paddingTop: 9 }}>
            <button onClick={addStep}
              style={{
                width: 32, height: 32, borderRadius: 6, cursor: "pointer",
                background: "transparent", border: "1px dashed rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.15)", fontSize: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'JetBrains Mono Variable', monospace",
              }}>+</button>
          </div>
        )}
      </div>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.1)", fontFamily: "'JetBrains Mono Variable', monospace" }}>
        {steps.length === 1 ? "mono · add steps for melody" :
          `${steps.length} steps · drag to reorder · ⌒ ties same notes`}
      </div>
    </div>
  );
}

/* ─── Pulse Indicator ─── */
function PulseRing({ active, color }) {
  return (
    <div style={{
      width: 10, height: 10, borderRadius: "50%",
      background: active ? color.bg : "rgba(255,255,255,0.05)",
      boxShadow: active ? `0 0 12px ${color.glow}, 0 0 24px ${color.glow}` : "none",
      transition: "all 0.06s ease-out",
    }} />
  );
}

/* ─── Voice Line ─── */
function VoiceLine({ line, index, color, onUpdate, onRemove, playing, currentStepIndex, scaleNotes }) {
  const [pulse, setPulse] = useState(false);
  const [showTimbrePicker, setShowTimbrePicker] = useState(false);
  const pulseTimer = useRef(null);
  const timbreInfo = TIMBRES.find((t) => t.id === line.timbre) || TIMBRES[0];
  const isPercTimbre = timbreInfo.group === "Perc";

  useEffect(() => {
    if (!playing) { setPulse(false); return; }
    const measureMs = (60 / BPM_DEFAULT) * 4 * 1000;
    const intervalMs = measureMs / line.rate;
    let mounted = true;
    const tick = () => { if (!mounted || line.muted) return; setPulse(true); setTimeout(() => mounted && setPulse(false), 80); };
    tick();
    pulseTimer.current = setInterval(tick, intervalMs);
    return () => { mounted = false; clearInterval(pulseTimer.current); };
  }, [playing, line.rate, line.muted]);

  return (
    <div className="dl-voice-card" style={{
      background: "rgba(255,255,255,0.02)", border: `1px solid ${line.muted ? "rgba(255,255,255,0.04)" : `${color.bg}22`}`,
      borderRadius: 16, padding: "20px 24px",
      opacity: line.muted ? 0.4 : 1, transition: "all 0.3s ease",
    }}>
      <div className="dl-voice-row" style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div className="dl-top-row" style={{ display: "contents" }}>
          {/* Pulse + Index */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 30 }}>
            <PulseRing active={pulse && !line.muted} color={color} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono Variable', monospace" }}>{String(index + 1).padStart(2, "0")}</span>
          </div>

          {/* Dial */}
          <div className="dl-dial-wrap" style={{ flexShrink: 0 }}>
            <RateDial value={line.rate} onChange={(r) => onUpdate({ ...line, rate: r })} color={color} size={90} />
          </div>

          {/* Mute + Remove */}
          <div className="dl-mute-col" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", marginLeft: "auto" }}>
            <button onClick={() => onUpdate({ ...line, muted: !line.muted })}
              style={{ background: line.muted ? "rgba(255,255,255,0.06)" : `${color.bg}18`, border: `1px solid ${line.muted ? "rgba(255,255,255,0.08)" : `${color.bg}44`}`, borderRadius: 8, width: 36, height: 36, cursor: "pointer", color: line.muted ? "rgba(255,255,255,0.3)" : color.bg, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
              title={line.muted ? "Unmute" : "Mute"}>
              {line.muted ? "◇" : "◆"}
            </button>
            <button onClick={onRemove}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, width: 36, height: 36, cursor: "pointer", color: "rgba(255,255,255,0.2)", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Remove">✕</button>
          </div>
        </div>

        <div className="dl-controls" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowTimbrePicker(!showTimbrePicker)}
                style={{ background: `${color.bg}12`, border: `1px solid ${color.bg}44`, borderRadius: 8, padding: "5px 12px", cursor: "pointer", color: color.bg, fontSize: 11, fontFamily: "'JetBrains Mono Variable', monospace", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}>
                <span style={{ fontSize: 13 }}>{isPercTimbre ? "◈" : timbreInfo.group === "FM" ? "◎" : timbreInfo.group === "Synth" ? "◉" : timbreInfo.group === "Instrument" ? "♪" : "○"}</span>
                {timbreInfo.label}
                <span style={{ fontSize: 8, opacity: 0.5 }}>▼</span>
              </button>
              {showTimbrePicker && (<>
                <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowTimbrePicker(false)} />
                <TimbrePicker current={line.timbre} onSelect={(t) => onUpdate({ ...line, timbre: t })} onClose={() => setShowTimbrePicker(false)} color={color} />
              </>)}
            </div>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.12)", fontStyle: "italic" }}>{timbreInfo.desc}</span>
          </div>

          {/* Sequence (always visible) */}
          <StepSequencer
            steps={line.steps}
            onChange={(newSteps) => onUpdate({ ...line, steps: newSteps })}
            color={color}
            currentStep={playing && !line.muted ? currentStepIndex : -1}
            isPercTimbre={isPercTimbre}
            scaleNotes={scaleNotes}
          />

          {/* Volume */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono Variable', monospace", minWidth: 24 }}>VOL</span>
            <input type="range" min={-30} max={0} step={1} value={line.volume} onChange={(e) => onUpdate({ ...line, volume: Number(e.target.value) })} style={{ flex: 1, accentColor: color.bg, height: 3 }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono Variable', monospace", minWidth: 30, textAlign: "right" }}>{line.volume}dB</span>
          </div>
          {/* Pan */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono Variable', monospace", minWidth: 24 }}>PAN</span>
            <input type="range" min={-100} max={100} step={1} value={Math.round((line.pan || 0) * 100)}
              onChange={(e) => onUpdate({ ...line, pan: Number(e.target.value) / 100 })}
              style={{ flex: 1, accentColor: color.bg, height: 3 }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono Variable', monospace", minWidth: 30, textAlign: "right" }}>
              {(line.pan || 0) === 0 ? "C" : (line.pan || 0) < 0 ? `L${Math.abs(Math.round((line.pan||0)*100))}` : `R${Math.round((line.pan||0)*100)}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── PRESETS ─── */
const PRESETS = [
  {
    name: "Reich Pulse",
    desc: "Classic polyrhythm texture",
    root: "C", scale: "Reich Pulse", bpm: 120, octLo: 4, octHi: 5,
    voices: 5, reverb: 0.25, delay: 0.1, delaySyncIdx: 2, timbre: "kalimba",
  },
  {
    name: "Eno Ambient",
    desc: "Floating, spacious, still",
    root: "D", scale: "Eno", bpm: 72, octLo: 3, octHi: 5,
    voices: 3, reverb: 0.6, delay: 0.25, delaySyncIdx: 3, timbre: "vibes",
  },
  {
    name: "Young Drone",
    desc: "Deep meditative fifths",
    root: "C", scale: "Young", bpm: 60, octLo: 3, octHi: 4,
    voices: 3, reverb: 0.7, delay: 0.08, delaySyncIdx: 2, timbre: "organ",
  },
  {
    name: "Riley In C",
    desc: "Kinetic, modal, layered",
    root: "C", scale: "Riley", bpm: 138, octLo: 3, octHi: 5,
    voices: 6, reverb: 0.2, delay: 0.15, delaySyncIdx: 1, timbre: "kalimba",
  },
  {
    name: "Pärt Still",
    desc: "Luminous triadic bells",
    root: "C", scale: "Pärt", bpm: 76, octLo: 4, octHi: 5,
    voices: 3, reverb: 0.5, delay: 0.12, delaySyncIdx: 3, timbre: "fm_bell",
  },
  {
    name: "Xenakis Stochastic",
    desc: "Stochastic, jagged, dense",
    root: "C", scale: "Xenakis", bpm: 152, octLo: 4, octHi: 5,
    voices: 7, reverb: 0.1, delay: 0.05, delaySyncIdx: 0, timbre: "click",
  },
  {
    name: "Ligeti Swarm",
    desc: "Dense chromatic swarm",
    root: "C", scale: "Ligeti", bpm: 132, octLo: 4, octHi: 5,
    voices: 8, reverb: 0.3, delay: 0.05, delaySyncIdx: 0, timbre: "sine",
  },
  {
    name: "Chaos",
    desc: "12-tone, dense, unhinged",
    root: "C", scale: "12-Tone", bpm: 140, octLo: 3, octHi: 6,
    voices: 7, reverb: 0.15, delay: 0.2, delaySyncIdx: 0, timbre: "kalimba",
  },
];

/* ─── Main App ─── */
export default function Driftloom() {
  const [rootNote, setRootNote] = useState("C");
  const [scaleName, setScaleName] = useState("Reich Pulse");
  const [octLo, setOctLo] = useState(3);
  const [octHi, setOctHi] = useState(5);
  const [lines, setLines] = useState(() => [createDefaultLine(0, "C", "Reich Pulse"), createDefaultLine(1, "C", "Reich Pulse")]);
  const [playing, setPlaying] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => !sessionStorage.getItem("driftloom-visited"));
  const [bpm, setBpm] = useState(BPM_DEFAULT);
  const [masterVol, setMasterVol] = useState(-6);
  const [stepIndices, setStepIndices] = useState({});
  const synthsRef = useRef({});
  const pannersRef = useRef({});
  const loopsRef = useRef({});
  const stepCounters = useRef({});
  const transportStarted = useRef(false);
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const scaleNotes = getScaleNotes(rootNote, scaleName, octLo, octHi);

  // Delay sync options: label, fraction of beat
  const DELAY_SYNCS = [
    { label: "1/16", mult: 0.25 },
    { label: "1/8", mult: 0.5 },
    { label: "d1/8", mult: 0.75 },
    { label: "1/4", mult: 1 },
    { label: "d1/4", mult: 1.5 },
    { label: "1/2", mult: 2 },
  ];

  // ─── Global Effects Bus ───
  const [reverbMix, setReverbMix] = useState(0.3);
  const [delayMix, setDelayMix] = useState(0.15);
  const [delaySyncIdx, setDelaySyncIdx] = useState(2); // default dotted 1/8
  const reverbRef = useRef(null);
  const delayRef = useRef(null);
  const dryRef = useRef(null);
  const reverbGainRef = useRef(null);
  const delayGainRef = useRef(null);
  const limiterRef = useRef(null);

  // Compute delay time from BPM and sync (clamped to 1s max for Tone.js)
  const delayTimeSec = Math.min((60 / bpm) * DELAY_SYNCS[delaySyncIdx].mult, 1.0);

  // Initialize effects once (with limiter on master)
  useEffect(() => {
    const limiter = new Tone.Limiter(-3).toDestination();
    const masterGain = new Tone.Gain(0).connect(limiter);
    masterGain.gain.value = Math.pow(10, masterVol / 20); // dB to linear
    const rev = new Tone.Reverb({ decay: 3.5, preDelay: 0.02 }).connect(masterGain);
    const del = new Tone.FeedbackDelay({ delayTime: 0.375, feedback: 0.35, wet: 1 }).connect(masterGain);
    const dry = new Tone.Gain(1).connect(masterGain);
    const revGain = new Tone.Gain(0.3).connect(rev);
    const delGain = new Tone.Gain(0.15).connect(del);
    reverbRef.current = rev;
    delayRef.current = del;
    dryRef.current = dry;
    reverbGainRef.current = revGain;
    delayGainRef.current = delGain;
    limiterRef.current = masterGain;
    return () => {
      limiter.dispose(); masterGain.dispose();
      rev.dispose(); del.dispose(); dry.dispose(); revGain.dispose(); delGain.dispose();
    };
  }, []);

  // Update effect params when controls change
  useEffect(() => {
    if (reverbGainRef.current) reverbGainRef.current.gain.value = reverbMix;
  }, [reverbMix]);
  useEffect(() => {
    if (delayGainRef.current) delayGainRef.current.gain.value = delayMix;
    if (delayRef.current) delayRef.current.delayTime.value = delayTimeSec;
  }, [delayMix, delayTimeSec]);
  useEffect(() => {
    if (limiterRef.current) limiterRef.current.gain.value = Math.pow(10, masterVol / 20);
  }, [masterVol]);

  const startAudio = useCallback(async () => {
    await Tone.start();
    Tone.getTransport().bpm.value = bpm;
    if (!transportStarted.current) { Tone.getTransport().start(); transportStarted.current = true; }
  }, [bpm]);

  useEffect(() => { Tone.getTransport().bpm.value = bpm; }, [bpm]);

  // Helper to create a loop for a given line
  const createLoop = useCallback((line, synth, intervalSec) => {
    const lineId = line.id;
    const loop = new Tone.Loop((time) => {
      const currentLine = linesRef.current.find(l => l.id === lineId) || line;
      const steps = currentLine.steps;
      const stepIdx = stepCounters.current[lineId] % steps.length;
      const step = steps[stepIdx];
      const isTied = step.tied && stepIdx > 0;

      if (step.active !== false && !isTied) {
        let tiedCount = 0;
        for (let k = stepIdx + 1; k < steps.length; k++) {
          if (steps[k]?.tied && steps[k]?.note === step.note) tiedCount++;
          else break;
        }
        const currentInterval = (60 / bpm) * (4 / currentLine.rate);
        const totalDuration = currentInterval * (1 + tiedCount);
        triggerSynthWithDuration(synth, currentLine.timbre, step.note, time, totalDuration);
      }
      Tone.getDraw().schedule(() => {
        setStepIndices((prev) => ({ ...prev, [lineId]: stepIdx }));
      }, time);
      stepCounters.current[lineId] = stepIdx + 1;
    }, intervalSec).start(0);
    return loop;
  }, [bpm]);

  // Track pending rate changes to apply at measure boundary
  const pendingRates = useRef({}); // { [id]: rate }
  const measureClockRef = useRef(null);
  const prevRatesRef = useRef({}); // track last-applied rates

  // Master measure clock — fires at start of each measure, applies pending changes
  useEffect(() => {
    if (!playing) {
      if (measureClockRef.current) { measureClockRef.current.dispose(); measureClockRef.current = null; }
      return;
    }
    const measureSec = (60 / bpm) * 4;
    if (measureClockRef.current) measureClockRef.current.dispose();
    measureClockRef.current = new Tone.Loop((time) => {
      // Apply any pending rate changes
      const pending = { ...pendingRates.current };
      if (Object.keys(pending).length === 0) return;
      pendingRates.current = {};

      // Reset step counters for changed lines and rebuild their loops
      Object.entries(pending).forEach(([id, newRate]) => {
        const numId = Number(id);
        stepCounters.current[numId] = 0;
        const synth = synthsRef.current[numId];
        if (synth && loopsRef.current[numId]) {
          loopsRef.current[numId].dispose();
          const newInterval = (60 / bpm) * (4 / newRate);
          const line = linesRef.current.find(l => l.id === numId);
          if (line) {
            loopsRef.current[numId] = createLoop(line, synth, newInterval);
          }
        }
        prevRatesRef.current[numId] = newRate;
      });
    }, measureSec).start(0);

    return () => { if (measureClockRef.current) { measureClockRef.current.dispose(); measureClockRef.current = null; } };
  }, [playing, bpm, createLoop]);

  useEffect(() => {
    if (!playing) return;
    const activeIds = new Set(lines.map((l) => l.id));

    // Clean up removed lines
    Object.keys(synthsRef.current).forEach((id) => {
      if (!activeIds.has(Number(id))) {
        loopsRef.current[id]?.dispose();
        pannersRef.current[id]?.dispose();
        const node = synthsRef.current[id];
        if (node._parentSynth) node._parentSynth.dispose();
        if (node._chain) node._chain.forEach(n => n.dispose());
        node.dispose();
        delete loopsRef.current[id]; delete synthsRef.current[id]; delete pannersRef.current[id]; delete stepCounters.current[id];
        delete prevRatesRef.current[id];
        delete pendingRates.current[id];
      }
    });

    lines.forEach((line) => {
      const id = line.id;
      const existing = synthsRef.current[id];
      const needsNewSynth = !existing || existing._timbreId !== line.timbre;
      const intervalSec = (60 / bpm) * (4 / line.rate);
      if (!stepCounters.current[id]) stepCounters.current[id] = 0;

      if (needsNewSynth) {
        // Dispose old
        if (existing) {
          loopsRef.current[id]?.dispose();
          if (existing._parentSynth) existing._parentSynth.dispose();
          if (existing._chain) existing._chain.forEach(n => n.dispose());
          existing.dispose();
        }
        delete synthsRef.current[id];

        const s = createSynthForTimbre(line.timbre);
        const panner = new Tone.Panner(line.pan || 0);
        s.connect(panner);
        if (dryRef.current) panner.connect(dryRef.current);
        if (reverbGainRef.current) panner.connect(reverbGainRef.current);
        if (delayGainRef.current) panner.connect(delayGainRef.current);
        pannersRef.current[id] = panner;
        s._timbreId = line.timbre;
        const voice = getTriggerableSynth(s);
        if (voice.volume) voice.volume.value = line.muted ? -Infinity : line.volume;
        synthsRef.current[id] = s;

        if (loopsRef.current[id]) loopsRef.current[id].dispose();
        loopsRef.current[id] = createLoop(line, s, intervalSec);
        prevRatesRef.current[id] = line.rate;
      } else {
        const voice = getTriggerableSynth(existing);
        if (voice.volume) voice.volume.value = line.muted ? -Infinity : line.volume;
        if (pannersRef.current[id]) pannersRef.current[id].pan.value = line.pan || 0;

        // Check if rate changed — queue it for next measure boundary
        const prevRate = prevRatesRef.current[id];
        if (prevRate !== undefined && prevRate !== line.rate) {
          pendingRates.current[id] = line.rate;
          // Don't rebuild loop now — measure clock will handle it
        } else if (prevRate === undefined) {
          // First time — just set it
          if (loopsRef.current[id]) loopsRef.current[id].dispose();
          loopsRef.current[id] = createLoop(line, existing, intervalSec);
          prevRatesRef.current[id] = line.rate;
        }
        // Other changes (volume, pan, steps) still apply immediately
      }
    });
  }, [lines, playing, bpm, createLoop]);

  const handlePlay = async () => {
    if (!playing) {
      stepCounters.current = {};
      setStepIndices({});
      await startAudio();
      setPlaying(true);
    } else {
      Object.values(loopsRef.current).forEach((l) => l?.dispose());
      Object.values(pannersRef.current).forEach((p) => p?.dispose());
      Object.values(synthsRef.current).forEach((s) => {
        if (s._parentSynth) s._parentSynth.dispose();
        if (s._chain) s._chain.forEach(n => n.dispose());
        s.dispose();
      });
      loopsRef.current = {}; synthsRef.current = {}; pannersRef.current = {}; stepCounters.current = {};
      pendingRates.current = {}; prevRatesRef.current = {};
      setStepIndices({});
      setAutoMode(false);
      setPlaying(false);
    }
  };

  useEffect(() => () => {
    Object.values(loopsRef.current).forEach((l) => l?.dispose());
    Object.values(synthsRef.current).forEach((s) => s?.dispose());
    Tone.getTransport().stop();
  }, []);

  const updateLine = (i, nl) => setLines((p) => p.map((l, j) => j === i ? nl : l));
  const removeLine = (i) => {
    const line = lines[i];
    loopsRef.current[line.id]?.dispose(); delete loopsRef.current[line.id];
    pannersRef.current[line.id]?.dispose(); delete pannersRef.current[line.id];
    const node = synthsRef.current[line.id];
    if (node) {
      if (node._parentSynth) node._parentSynth.dispose();
      if (node._chain) node._chain.forEach(n => n.dispose());
      node.dispose();
    }
    delete synthsRef.current[line.id];
    delete stepCounters.current[line.id];
    setLines((p) => p.filter((_, j) => j !== i));
  };
  const currentTimbre = lines.length > 0 ? lines[0].timbre : "kalimba";
  const addLine = () => { if (lines.length < MAX_LINES) setLines((p) => [...p, createDefaultLine(p.length, rootNote, scaleName, octLo, octHi, currentTimbre)]); };
  const randomizeAll = () => {
    const count = Math.max(lines.length, 2);
    setLines(Array.from({ length: count }, (_, i) => createDefaultLine(i, rootNote, scaleName, octLo, octHi, currentTimbre)));
  };
  const loadPreset = (preset) => {
    setRootNote(preset.root);
    setScaleName(preset.scale);
    setBpm(preset.bpm);
    setOctLo(preset.octLo);
    setOctHi(preset.octHi);
    setReverbMix(preset.reverb);
    setDelayMix(preset.delay);
    setDelaySyncIdx(preset.delaySyncIdx);
    const newLines = Array.from({ length: preset.voices }, (_, i) =>
      createDefaultLine(i, preset.root, preset.scale, preset.octLo, preset.octHi, preset.timbre)
    );
    setLines(newLines);
  };
  const polyLabel = lines.filter((l) => !l.muted).map((l) => Math.round(l.rate)).join(" : ");

  // ─── Auto Mode ───
  const [autoMode, setAutoMode] = useState(false);
  const AUTO_INTERVAL_MS = 4000;
  const autoRef = useRef(null);

  useEffect(() => {
    if (!autoMode || !playing) {
      clearInterval(autoRef.current);
      autoRef.current = null;
      return;
    }
    autoRef.current = setInterval(() => {
      setLines((prev) => {
        const count = prev.length;
        const timbre = prev.length > 0 ? prev[0].timbre : "kalimba";
        if (count === 0) return [createDefaultLine(0, rootNote, scaleName, octLo, octHi, timbre)];
        if (count >= MAX_LINES) {
          const removeIdx = randomInt(0, count - 1);
          const removed = prev[removeIdx];
          if (loopsRef.current[removed.id]) { loopsRef.current[removed.id].dispose(); delete loopsRef.current[removed.id]; }
          if (pannersRef.current[removed.id]) { pannersRef.current[removed.id].dispose(); delete pannersRef.current[removed.id]; }
          const node = synthsRef.current[removed.id];
          if (node) {
            if (node._parentSynth) node._parentSynth.dispose();
            if (node._chain) node._chain.forEach(n => n.dispose());
            node.dispose();
            delete synthsRef.current[removed.id];
          }
          delete stepCounters.current[removed.id];
          return prev.filter((_, j) => j !== removeIdx);
        }
        const t = (count - 1) / (MAX_LINES - 1);
        const addProb = 1 - t * t;
        const shouldAdd = Math.random() < addProb;

        if (shouldAdd) {
          return [...prev, createDefaultLine(count, rootNote, scaleName, octLo, octHi, timbre)];
        } else if (count > 1) {
          const removeIdx = randomInt(0, count - 1);
          const removed = prev[removeIdx];
          if (loopsRef.current[removed.id]) { loopsRef.current[removed.id].dispose(); delete loopsRef.current[removed.id]; }
          if (pannersRef.current[removed.id]) { pannersRef.current[removed.id].dispose(); delete pannersRef.current[removed.id]; }
          const node = synthsRef.current[removed.id];
          if (node) {
            if (node._parentSynth) node._parentSynth.dispose();
            if (node._chain) node._chain.forEach(n => n.dispose());
            node.dispose();
            delete synthsRef.current[removed.id];
          }
          delete stepCounters.current[removed.id];
          return prev.filter((_, j) => j !== removeIdx);
        }
        return prev;
      });
    }, AUTO_INTERVAL_MS);
    return () => clearInterval(autoRef.current);
  }, [autoMode, playing]);

  return (
    <div className="dl-outer" style={{ minHeight: "100vh", background: "#07070c", color: "#e8e8ec", fontFamily: "'JetBrains Mono Variable', 'SF Mono', monospace", padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>

      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 className="dl-title" style={{ fontFamily: "'Sora Variable', sans-serif", fontSize: 44, fontWeight: 800, letterSpacing: -1, margin: 0, background: "linear-gradient(135deg, rgb(107,184,160), rgb(123,164,212), rgb(184,139,212), rgb(212,160,123))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "300% 300%", animation: "gradShift 10s ease infinite" }}>DRIFTLOOM</h1>
        <p style={{ fontFamily: "'Sora Variable', sans-serif", fontSize: 12, fontWeight: 200, letterSpacing: 6, textTransform: "uppercase", color: "rgba(255,255,255,0.25)", margin: "4px 0 0 0" }}>polyrhythm texture engine</p>
        <style>{`
          @keyframes gradShift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
          @media (max-width: 640px) {
            .dl-voice-row {
              flex-direction: column !important;
              align-items: stretch !important;
              gap: 10px !important;
            }
            .dl-voice-row > * { min-width: 0 !important; }
            .dl-top-row {
              display: flex !important;
              align-items: center !important;
              gap: 12px !important;
            }
            .dl-dial-wrap svg { width: 70px !important; height: 70px !important; }
            .dl-controls { width: 100% !important; }
            .dl-mute-col { flex-direction: row !important; gap: 8px !important; }
            .dl-transport { gap: 10px !important; padding: 10px 14px !important; }
            .dl-fx-bar { gap: 10px !important; padding: 8px 12px !important; }
            .dl-presets { gap: 5px !important; }
            .dl-presets button { padding: 5px 8px !important; font-size: 10px !important; }
            .dl-palette-bar { gap: 8px !important; padding: 8px 12px !important; }
            .dl-title { font-size: 30px !important; }
            .dl-outer { padding: 16px 8px !important; }
            .dl-voice-card { padding: 12px !important; }
          }
        `}</style>
      </div>

      <div className="dl-presets" style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", justifyContent: "center", maxWidth: 700 }}>
        {PRESETS.map((p) => (
          <button key={p.name} onClick={() => loadPreset(p)} title={p.desc}
            style={{
              padding: "7px 14px", borderRadius: 8, cursor: "pointer",
              background: scaleName === p.scale && bpm === p.bpm ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${scaleName === p.scale && bpm === p.bpm ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`,
              color: scaleName === p.scale && bpm === p.bpm ? "#e8e8ec" : "rgba(255,255,255,0.35)",
              fontSize: 11, fontFamily: "'JetBrains Mono Variable', monospace",
              letterSpacing: 0.5, transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.2)"; e.target.style.color = "rgba(255,255,255,0.6)"; }}
            onMouseLeave={(e) => { 
              const active = scaleName === p.scale && bpm === p.bpm;
              e.target.style.borderColor = active ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)";
              e.target.style.color = active ? "#e8e8ec" : "rgba(255,255,255,0.35)";
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="dl-transport" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, padding: "14px 28px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={handlePlay}
          style={{ width: 52, height: 52, borderRadius: "50%", background: playing ? "rgba(107,184,160,0.15)" : "rgba(255,255,255,0.06)", border: `2px solid ${playing ? "#6BB8A0" : "rgba(255,255,255,0.12)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s ease", boxShadow: playing ? "0 0 20px rgba(107,184,160,0.3)" : "none" }}>
          {playing
            ? <svg width="16" height="16" viewBox="0 0 18 18"><rect width="18" height="18" rx="2" fill={playing ? "#6BB8A0" : "#e8e8ec"} /></svg>
            : <svg width="20" height="20" viewBox="0 0 20 20" style={{ marginLeft: 2 }}><polygon points="3,0 20,10 3,20" fill="#e8e8ec" /></svg>
          }
        </button>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>BPM</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="range" min={40} max={200} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} style={{ width: 80, accentColor: "#6BB8A0" }} />
            <span style={{ fontSize: 13, color: "#6BB8A0", minWidth: 28, fontFamily: "'JetBrains Mono Variable', monospace" }}>{bpm}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>MASTER</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="range" min={-30} max={0} value={masterVol} onChange={(e) => setMasterVol(Number(e.target.value))} style={{ width: 60, accentColor: "#6BB8A0" }} />
            <span style={{ fontSize: 10, color: "#6BB8A0", minWidth: 30, fontFamily: "'JetBrains Mono Variable', monospace" }}>{masterVol}dB</span>
          </div>
        </div>
        <div style={{ padding: "6px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 8, fontSize: 12, color: "rgba(255,255,255,0.5)", letterSpacing: 1, minWidth: 50, textAlign: "center", fontFamily: "'JetBrains Mono Variable', monospace" }}>
          {polyLabel || "—"}
        </div>
        <button onClick={randomizeAll}
          style={{ padding: "8px 14px", borderRadius: 10, cursor: "pointer", background: "rgba(123,164,212,0.08)", border: "1px solid rgba(123,164,212,0.25)", color: "#7BA4D4", fontSize: 11, fontFamily: "'JetBrains Mono Variable', monospace", letterSpacing: 1, transition: "all 0.2s" }}>
          SHUFFLE
        </button>
        <button onClick={() => setAutoMode(!autoMode)}
          style={{ padding: "8px 14px", borderRadius: 10, cursor: "pointer", background: autoMode ? "rgba(93,190,170,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${autoMode ? "rgba(93,190,170,0.4)" : "rgba(255,255,255,0.08)"}`, color: autoMode ? "#5DBEAA" : "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "'JetBrains Mono Variable', monospace", letterSpacing: 1, transition: "all 0.3s ease", boxShadow: autoMode ? "0 0 12px rgba(93,190,170,0.15)" : "none" }}>
          {autoMode ? "AUTO ●" : "AUTO"}
        </button>
      </div>

      <div className="dl-fx-bar" style={{
        display: "flex", alignItems: "center", gap: 18, marginBottom: 16,
        padding: "10px 24px", background: "rgba(255,255,255,0.015)",
        border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12,
        flexWrap: "wrap", justifyContent: "center",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>REVERB</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <input type="range" min={0} max={100} value={Math.round(reverbMix * 100)}
              onChange={(e) => setReverbMix(Number(e.target.value) / 100)}
              style={{ width: 65, accentColor: "#A07BC4" }} />
            <span style={{ fontSize: 10, color: "#A07BC4", minWidth: 26, fontFamily: "'JetBrains Mono Variable', monospace" }}>
              {Math.round(reverbMix * 100)}%
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>DELAY</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <input type="range" min={0} max={100} value={Math.round(delayMix * 100)}
              onChange={(e) => setDelayMix(Number(e.target.value) / 100)}
              style={{ width: 65, accentColor: "#7BA4D4" }} />
            <span style={{ fontSize: 10, color: "#7BA4D4", minWidth: 26, fontFamily: "'JetBrains Mono Variable', monospace" }}>
              {Math.round(delayMix * 100)}%
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>DLY SYNC</span>
          <div style={{ display: "flex", gap: 3 }}>
            {DELAY_SYNCS.map((ds, i) => (
              <button key={ds.label} onClick={() => setDelaySyncIdx(i)}
                style={{
                  padding: "3px 6px", borderRadius: 4, cursor: "pointer", fontSize: 9,
                  fontFamily: "'JetBrains Mono Variable', monospace",
                  background: delaySyncIdx === i ? "rgba(123,164,212,0.15)" : "transparent",
                  border: `1px solid ${delaySyncIdx === i ? "rgba(123,164,212,0.4)" : "rgba(255,255,255,0.06)"}`,
                  color: delaySyncIdx === i ? "#7BA4D4" : "rgba(255,255,255,0.25)",
                  transition: "all 0.15s",
                }}>
                {ds.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ width: 1, height: 30, background: "rgba(255,255,255,0.06)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>OCTAVES</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <select value={octLo} onChange={(e) => { const v = Number(e.target.value); setOctLo(v); if (v > octHi) setOctHi(v); }}
              style={{ background: "rgba(255,255,255,0.06)", color: "#7BC4A8", border: "1px solid rgba(123,196,168,0.25)", borderRadius: 4, padding: "3px 5px", fontSize: 11, fontFamily: "'JetBrains Mono Variable', monospace", cursor: "pointer", outline: "none" }}>
              {[2,3,4,5].map(o => <option key={o} value={o} style={{ background: "#0a0a0f" }}>{o}</option>)}
            </select>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>—</span>
            <select value={octHi} onChange={(e) => { const v = Number(e.target.value); setOctHi(v); if (v < octLo) setOctLo(v); }}
              style={{ background: "rgba(255,255,255,0.06)", color: "#7BC4A8", border: "1px solid rgba(123,196,168,0.25)", borderRadius: 4, padding: "3px 5px", fontSize: 11, fontFamily: "'JetBrains Mono Variable', monospace", cursor: "pointer", outline: "none" }}>
              {[3,4,5,6].map(o => <option key={o} value={o} style={{ background: "#0a0a0f" }}>{o}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Palette / Tonality selector */}
      <div className="dl-palette-bar" style={{
        display: "flex", alignItems: "center", gap: 14, marginBottom: 24,
        padding: "10px 20px", background: "rgba(255,255,255,0.015)",
        border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12,
        flexWrap: "wrap", justifyContent: "center",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>ROOT</span>
          <select value={rootNote} onChange={(e) => {
              const newRoot = e.target.value;
              setRootNote(newRoot);
              setLines([createDefaultLine(0, newRoot, scaleName, octLo, octHi, currentTimbre), createDefaultLine(1, newRoot, scaleName, octLo, octHi, currentTimbre)]);
            }}
            style={{
              background: "rgba(255,255,255,0.06)", color: "#7BA4D4",
              border: "1px solid rgba(123,164,212,0.25)", borderRadius: 6,
              padding: "5px 8px", fontSize: 13, fontFamily: "'JetBrains Mono Variable', monospace",
              cursor: "pointer", outline: "none",
            }}>
            {ROOT_NOTES.map(n => <option key={n} value={n} style={{ background: "#0a0a0f", color: "#eee" }}>{n}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>PALETTE</span>
          <select value={scaleName} onChange={(e) => {
              const newScale = e.target.value;
              setScaleName(newScale);
              setLines([createDefaultLine(0, rootNote, newScale, octLo, octHi, currentTimbre), createDefaultLine(1, rootNote, newScale, octLo, octHi, currentTimbre)]);
            }}
            style={{
              background: "rgba(255,255,255,0.06)", color: "#7BA4D4",
              border: "1px solid rgba(123,164,212,0.25)", borderRadius: 6,
              padding: "5px 8px", fontSize: 12, fontFamily: "'JetBrains Mono Variable', monospace",
              cursor: "pointer", outline: "none", maxWidth: 180,
            }}>
            {Object.entries(SCALE_GROUPS).map(([group, scales]) => (
              <optgroup key={group} label={group} style={{ background: "#0a0a0f", color: "#999" }}>
                {scales.map(s => <option key={s} value={s} style={{ background: "#0a0a0f", color: "#eee" }}>{s}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", maxWidth: 160, lineHeight: 1.4 }}>
          {scaleName === "12-Tone" ? "serial: all 12 before repeats" :
           scaleName === "Chromatic" ? "all 12, no filter" :
           `${getScaleIntervals(scaleName).length} pitch classes · weighted`}
        </div>
      </div>

      {/* Voice Lines */}
      <div style={{ width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", gap: 12 }}>
        {lines.map((line, i) => (
          <VoiceLine key={line.id} line={line} index={i} color={COLORS[i % COLORS.length]}
            onUpdate={(nl) => updateLine(i, nl)} onRemove={() => removeLine(i)}
            playing={playing} currentStepIndex={stepIndices[line.id] ?? -1}
            scaleNotes={scaleNotes} />
        ))}
        {lines.length < MAX_LINES && (
          <button onClick={addLine}
            style={{ background: "transparent", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 16, padding: 18, cursor: "pointer", color: "rgba(255,255,255,0.2)", fontSize: 13, fontFamily: "'JetBrains Mono Variable', monospace", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.2)"; e.target.style.color = "rgba(255,255,255,0.4)"; }}
            onMouseLeave={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.color = "rgba(255,255,255,0.2)"; }}>
            + add voice line ({lines.length}/{MAX_LINES})
          </button>
        )}
      </div>

      <div style={{ marginTop: 48, textAlign: "center", color: "rgba(255,255,255,0.12)", fontSize: 10, letterSpacing: 3 }}>
        click ♫ SEQ to add melody steps · 28 timbres across 5 groups
      </div>

      {showWelcome && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
          onClick={() => { setShowWelcome(false); sessionStorage.setItem("driftloom-visited", "1"); }}>
          <div style={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "36px 40px", maxWidth: 450, width: "90%", fontFamily: "'Sora Variable', sans-serif" }}
            onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px 0", background: "linear-gradient(135deg, #6BB8A0, #7BA4D4, #B88BD4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Welcome to Driftloom</h2>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: "0 0 28px 0" }}>3 steps to generative music</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, width: 56, textAlign: "center" }}>▶</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e8ec", marginBottom: 3 }}>Press play</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>Start with the default preset (Reich Pulse)</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span style={{ fontSize: 11, lineHeight: "22px", flexShrink: 0, width: 56, textAlign: "center", fontFamily: "'JetBrains Mono Variable', monospace", fontWeight: 700, color: "#7BA4D4" }}>SHUFFLE</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e8ec", marginBottom: 3 }}>Press shuffle</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>Don't like what you hear? Randomize everything</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span style={{ fontSize: 13, lineHeight: "22px", flexShrink: 0, width: 56, textAlign: "center", fontFamily: "'JetBrains Mono Variable', monospace", fontWeight: 700, color: "#A07BC4" }}>AUTO</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e8ec", marginBottom: 3 }}>Press auto</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>Let the music continuously evolve on its own</div>
                </div>
              </div>
            </div>
            <button onClick={() => { setShowWelcome(false); sessionStorage.setItem("driftloom-visited", "1"); }}
              style={{ marginTop: 28, width: "100%", padding: "12px 0", background: "rgba(107,184,160,0.12)", border: "1px solid rgba(107,184,160,0.3)", borderRadius: 10, color: "#6BB8A0", fontSize: 14, fontFamily: "'Sora Variable', sans-serif", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.target.style.background = "rgba(107,184,160,0.2)"; }}
              onMouseLeave={(e) => { e.target.style.background = "rgba(107,184,160,0.12)"; }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
