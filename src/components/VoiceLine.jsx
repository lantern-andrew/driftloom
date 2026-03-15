import { useState, useRef, useEffect } from "react";
import { TIMBRES, BPM_DEFAULT } from "../constants";
import RateDial from "./RateDial";
import TimbrePicker from "./TimbrePicker";
import StepSequencer from "./StepSequencer";
import PulseRing from "./PulseRing";

export default function VoiceLine({ line, index, color, onUpdate, onRemove, playing, currentStepIndex, scaleNotes }) {
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 30 }}>
            <PulseRing active={pulse && !line.muted} color={color} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono Variable', monospace" }}>{String(index + 1).padStart(2, "0")}</span>
          </div>

          <div className="dl-dial-wrap" style={{ flexShrink: 0 }}>
            <RateDial value={line.rate} onChange={(r) => onUpdate({ ...line, rate: r })} color={color} size={90} />
          </div>

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

          <StepSequencer
            steps={line.steps}
            onChange={(newSteps) => onUpdate({ ...line, steps: newSteps })}
            color={color}
            currentStep={playing && !line.muted ? currentStepIndex : -1}
            isPercTimbre={isPercTimbre}
            scaleNotes={scaleNotes}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono Variable', monospace", minWidth: 24 }}>VOL</span>
            <input type="range" min={-30} max={0} step={1} value={line.volume} onChange={(e) => onUpdate({ ...line, volume: Number(e.target.value) })} style={{ flex: 1, accentColor: color.bg, height: 3 }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono Variable', monospace", minWidth: 30, textAlign: "right" }}>{line.volume}dB</span>
          </div>
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
