export const ALL_NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
export const ALL_PITCHED = [];
for (let oct = 2; oct <= 6; oct++) {
  for (const n of ALL_NOTE_NAMES) {
    ALL_PITCHED.push(`${n}${oct}`);
    if (n === "C" && oct === 6) break;
  }
}
export const NOTES = ALL_PITCHED;

export const ROOT_NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

export const SCALES = {
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

export const SCALE_GROUPS = {
  "Composer":    ["Reich Pulse","Reich Open","Glass","Adams","Riley","Young","Pärt","Eno","Sakamoto","Feldman","Ligeti","Xenakis"],
  "Texture":     ["Whole Tone","Diminished"],
  "Free":        ["Chromatic","12-Tone"],
};

export const MAX_LINES = 8;
export const MIN_RATE = 1;
export const MAX_RATE = 12;
export const BPM_DEFAULT = 120;
export const MAX_STEPS = 16;

export const TIMBRES = [
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
export const TIMBRE_GROUPS = ["Instrument", "Basic", "FM", "Synth", "Perc"];

export const COLORS = [
  { bg: "#6BB8A0", glow: "rgba(107,184,160,0.4)" },
  { bg: "#7BA4D4", glow: "rgba(123,164,212,0.4)" },
  { bg: "#B88BD4", glow: "rgba(184,139,212,0.4)" },
  { bg: "#7BC4A8", glow: "rgba(123,196,168,0.4)" },
  { bg: "#5DBEAA", glow: "rgba(93,190,170,0.4)" },
  { bg: "#8DB4DE", glow: "rgba(141,180,222,0.4)" },
  { bg: "#A07BC4", glow: "rgba(160,123,196,0.4)" },
  { bg: "#7BC4A8", glow: "rgba(123,196,168,0.4)" },
];

export const PRESETS = [
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

export const DELAY_SYNCS = [
  { label: "1/16", mult: 0.25 },
  { label: "1/8", mult: 0.5 },
  { label: "d1/8", mult: 0.75 },
  { label: "1/4", mult: 1 },
  { label: "d1/4", mult: 1.5 },
  { label: "1/2", mult: 2 },
];
