export default function PulseRing({ active, color }) {
  return (
    <div style={{
      width: 10, height: 10, borderRadius: "50%",
      background: active ? color.bg : "rgba(255,255,255,0.05)",
      boxShadow: active ? `0 0 12px ${color.glow}, 0 0 24px ${color.glow}` : "none",
      transition: "all 0.06s ease-out",
    }} />
  );
}
