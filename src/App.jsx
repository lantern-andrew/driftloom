import { useState, useRef, useCallback, useEffect } from "react";
import * as Tone from "tone";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/sora";

import {
  ROOT_NOTES, SCALE_GROUPS, COLORS, PRESETS, DELAY_SYNCS,
  MAX_LINES, BPM_DEFAULT,
} from "./constants";
import { createSynthForTimbre, getTriggerableSynth, triggerSynthWithDuration } from "./audio";
import { getScaleIntervals, getScaleNotes, createDefaultLine, randomInt } from "./music";
import VoiceLine from "./components/VoiceLine";

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

  // ─── Global Effects Bus ───
  const [reverbMix, setReverbMix] = useState(0.3);
  const [delayMix, setDelayMix] = useState(0.15);
  const [delaySyncIdx, setDelaySyncIdx] = useState(2);
  const reverbRef = useRef(null);
  const delayRef = useRef(null);
  const dryRef = useRef(null);
  const reverbGainRef = useRef(null);
  const delayGainRef = useRef(null);
  const limiterRef = useRef(null);

  const delayTimeSec = Math.min((60 / bpm) * DELAY_SYNCS[delaySyncIdx].mult, 1.0);

  useEffect(() => {
    const limiter = new Tone.Limiter(-3).toDestination();
    const masterGain = new Tone.Gain(0).connect(limiter);
    masterGain.gain.value = Math.pow(10, masterVol / 20);
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
    if (navigator.audioSession) navigator.audioSession.type = "playback";
    const a = document.createElement("audio");
    a.src = "/silence.wav";
    a.setAttribute("playsinline", "");
    document.body.appendChild(a);
    a.play().catch(() => {}).finally(() => a.remove());
    await Tone.start();
    Tone.getTransport().bpm.value = bpm;
    if (!transportStarted.current) { Tone.getTransport().start(); transportStarted.current = true; }
  }, [bpm]);

  useEffect(() => { Tone.getTransport().bpm.value = bpm; }, [bpm]);

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

  const pendingRates = useRef({});
  const measureClockRef = useRef(null);
  const prevRatesRef = useRef({});

  useEffect(() => {
    if (!playing) {
      if (measureClockRef.current) { measureClockRef.current.dispose(); measureClockRef.current = null; }
      return;
    }
    const measureSec = (60 / bpm) * 4;
    if (measureClockRef.current) measureClockRef.current.dispose();
    measureClockRef.current = new Tone.Loop((time) => {
      const pending = { ...pendingRates.current };
      if (Object.keys(pending).length === 0) return;
      pendingRates.current = {};

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

        const prevRate = prevRatesRef.current[id];
        if (prevRate !== undefined && prevRate !== line.rate) {
          pendingRates.current[id] = line.rate;
        } else if (prevRate === undefined) {
          if (loopsRef.current[id]) loopsRef.current[id].dispose();
          loopsRef.current[id] = createLoop(line, existing, intervalSec);
          prevRatesRef.current[id] = line.rate;
        }
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
    <div className="dl-outer" style={{ minHeight: "100vh", background: "#07070c", color: "#e8e8ec", fontFamily: "'JetBrains Mono Variable', 'SF Mono', monospace", padding: "calc(env(safe-area-inset-top, 0px) + 56px) 20px 32px", display: "flex", flexDirection: "column", alignItems: "center" }}>

      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 className="dl-title" style={{ fontFamily: "'Sora Variable', sans-serif", fontSize: 44, fontWeight: 800, letterSpacing: -1, margin: 0, background: "linear-gradient(135deg, rgb(107,184,160), rgb(123,164,212), rgb(184,139,212), rgb(212,160,123))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "300% 300%", animation: "gradShift 10s ease infinite" }}>DRIFTLOOM</h1>
        <p style={{ fontFamily: "'Sora Variable', sans-serif", fontSize: 12, fontWeight: 200, letterSpacing: 6, textTransform: "uppercase", color: "rgba(255,255,255,0.25)", margin: "4px 0 0 0" }}>polyrhythm texture engine</p>
        <style>{`
          @keyframes gradShift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
          @media (max-width: 640px) {
            .dl-outer { padding-top: calc(env(safe-area-inset-top, 0px) + 80px) !important; }
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
            .dl-outer { padding: calc(env(safe-area-inset-top, 0px) + 48px) 8px 16px !important; }
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
