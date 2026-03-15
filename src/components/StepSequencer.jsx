import { useState, useRef } from "react";
import { MAX_STEPS, NOTES } from "../constants";

export default function StepSequencer({ steps, onChange, color, currentStep, isPercTimbre, scaleNotes }) {
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
    if (newSteps[0]) newSteps[0] = { ...newSteps[0], tied: false };
    onChange(newSteps);
  };
  const updateStep = (i, updates) => {
    onChange(steps.map((s, j) => j === i ? { ...s, ...updates } : s));
  };
  const toggleTie = (i) => {
    if (i === 0) return;
    const prev = steps[i - 1];
    const curr = steps[i];
    if (!isPercTimbre && prev.note !== curr.note) return;
    updateStep(i, { tied: !curr.tied });
  };
  const canTie = (i) => {
    if (i === 0 || isPercTimbre) return false;
    return steps[i - 1]?.note === steps[i]?.note;
  };

  const handleDragStart = (e, i) => {
    setDragIdx(i);
    dragRef.current = i;
    e.dataTransfer.effectAllowed = "move";
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
              {isTied && (
                <div style={{
                  width: 8, height: 2, background: color.bg, opacity: 0.5,
                  alignSelf: "center", marginTop: 10, marginLeft: -1, marginRight: -1,
                  borderRadius: 1,
                }} />
              )}
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
                <div style={{
                  width: 4, height: 4, borderRadius: "50%",
                  background: currentStep === i ? color.bg : "transparent",
                  boxShadow: currentStep === i ? `0 0 6px ${color.glow}` : "none",
                  transition: "all 0.05s", marginBottom: 1,
                }} />
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
                <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
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
