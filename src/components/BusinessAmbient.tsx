import { useEffect, useRef } from "react";

/**
 * BusinessAmbient — a subtle, living ambient layer for the business platform.
 * Purpose: gives the platform spatial depth without distracting from data.
 * NOT the frozen customer SpatialBackground — a distinct, calmer business variant.
 */
export default function BusinessAmbient() {
  const reduceRef = useRef(false);

  useEffect(() => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  if (reduceRef.current) {
    return <div className="fixed inset-0 -z-10 bg-slate-950" />;
  }

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-950 pointer-events-none">
      {/* Ambient gradient orbs — slow drift, very low opacity */}
      <div
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.07] blur-[120px]"
        style={{ background: "radial-gradient(circle, #6366f1, transparent 70%)", animation: "ambientDrift1 20s ease-in-out infinite alternate" }}
      />
      <div
        className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.05] blur-[140px]"
        style={{ background: "radial-gradient(circle, #22d3ee, transparent 70%)", animation: "ambientDrift2 25s ease-in-out infinite alternate" }}
      />
      <div
        className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full opacity-[0.04] blur-[100px]"
        style={{ background: "radial-gradient(circle, #818cf8, transparent 70%)", animation: "ambientDrift3 30s ease-in-out infinite alternate" }}
      />
      {/* Subtle grid overlay for spatial depth */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
}
