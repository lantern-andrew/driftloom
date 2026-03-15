import { TIMBRES, TIMBRE_GROUPS } from "../constants";

export default function TimbrePicker({ current, onSelect, onClose, color }) {
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
