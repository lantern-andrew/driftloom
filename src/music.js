import { ALL_NOTE_NAMES, ALL_PITCHED, SCALES, MAX_RATE } from "./constants";

export function getScaleIntervals(scaleName) {
  return (SCALES[scaleName] || SCALES["Chromatic"]).map(([i]) => i);
}

export function noteOctave(n) { return parseInt(n.match(/\d+$/)[0]); }
export function notePc(n) { return n.replace(/\d+$/, ""); }

export function getScaleNotes(root, scaleName, octLo = 3, octHi = 5) {
  const intervals = getScaleIntervals(scaleName);
  const rootIdx = ALL_NOTE_NAMES.indexOf(root);
  if (rootIdx === -1) return ALL_PITCHED;
  const scaleSet = new Set(intervals.map(i => ALL_NOTE_NAMES[(rootIdx + i) % 12]));
  return ALL_PITCHED.filter(n => {
    const oct = noteOctave(n);
    return scaleSet.has(notePc(n)) && oct >= octLo && oct <= octHi;
  });
}

export function getWeightedPool(root, scaleName, octLo = 3, octHi = 5) {
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

export function randomInt(min, max) {
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

export function generateRandomSteps(weightedPool, flatPool, scaleName, octLo, octHi) {
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

export function createDefaultLine(index, root, scaleName, octLo = 3, octHi = 5, timbre = "kalimba") {
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
