import { useRef, useCallback } from "react";
import { MIN_RATE, MAX_RATE } from "../constants";

export default function RateDial({ value, onChange, color, size = 90 }) {
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
