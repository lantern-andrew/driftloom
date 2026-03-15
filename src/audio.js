import * as Tone from "tone";

export function createSynthForTimbre(t) {
  switch (t) {
    // ─── Instruments (rich synthesis) ───
    case "piano": {
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
      const synth = new Tone.FMSynth({
        harmonicity: 4.0, modulationIndex: 2.5,
        envelope: { attack: 0.001, decay: 0.35, sustain: 0.0, release: 0.3 },
        modulation: { type: "sine" },
        modulationEnvelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 },
      });
      return synth;
    }
    case "vibes": {
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
      const synth = new Tone.Synth({
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.08, decay: 0.3, sustain: 0.6, release: 0.4 },
      });
      const filter = new Tone.Filter({ frequency: 800, type: "lowpass", rolloff: -24 });
      const autoFilter = new Tone.FrequencyShifter(0);
      synth.connect(filter);
      filter._parentSynth = synth;
      return filter;
    }
    case "flute": {
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
      const synth = new Tone.FMSynth({
        harmonicity: 5.01, modulationIndex: 3,
        envelope: { attack: 0.001, decay: 0.6, sustain: 0.0, release: 0.5 },
        modulation: { type: "triangle" },
        modulationEnvelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
      });
      return synth;
    }
    case "guitar": {
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
      const synth = new Tone.Synth({
        oscillator: { type: "fatsine", spread: 12, count: 5 },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.3 },
      });
      return synth;
    }
    case "sitar": {
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

export function getTriggerableSynth(node) {
  return node._parentSynth || node;
}

export function triggerSynth(synthNode, timbreId, note, time) {
  const synth = getTriggerableSynth(synthNode);
  const isNoise = timbreId === "noise_hat" || timbreId === "dust";
  if (isNoise) synth.triggerAttackRelease("32n", time);
  else synth.triggerAttackRelease(note, "32n", time);
}

export function triggerSynthWithDuration(synthNode, timbreId, note, time, durationSec) {
  const synth = getTriggerableSynth(synthNode);
  const isNoise = timbreId === "noise_hat" || timbreId === "dust";
  if (isNoise) synth.triggerAttackRelease(durationSec * 0.8, time);
  else synth.triggerAttackRelease(note, durationSec * 0.9, time);
}
