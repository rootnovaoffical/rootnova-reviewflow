import { useEffect, useRef } from "react";

interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }

export function Confetti({ trigger }: { trigger: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const activeRef = useRef(false);

  useEffect(() => {
    if (!trigger) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#6366f1", "#22d3ee", "#4ade80", "#facc15", "#f87171", "#a855f7"];
    particlesRef.current = Array.from({ length: 120 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -12 - 4,
      life: 0,
      maxLife: 100 + Math.random() * 60,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 6 + 3,
    }));
    activeRef.current = true;

    const draw = () => {
      if (!activeRef.current) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particlesRef.current.forEach((p) => {
        p.life++;
        if (p.life >= p.maxLife) return;
        alive = true;
        p.vy += 0.3;
        p.x += p.vx; p.y += p.vy;
        const alpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      ctx.globalAlpha = 1;
      if (alive) { rafRef.current = requestAnimationFrame(draw); }
      else { activeRef.current = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
    };
    draw();

    return () => { cancelAnimationFrame(rafRef.current); activeRef.current = false; };
  }, [trigger]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-[100] pointer-events-none" />;
}

export function Shockwave({ trigger }: { trigger: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!trigger || !ref.current) return;
    ref.current.classList.remove("shockwave-anim");
    void ref.current.offsetWidth;
    ref.current.classList.add("shockwave-anim");
  }, [trigger]);
  return (
    <div ref={ref} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99] pointer-events-none" style={{ width: 0, height: 0 }}>
      <div className="shockwave-ring" />
    </div>
  );
}

export function FloatingEmojis({ emojis, trigger }: { emojis: string[]; trigger: boolean }) {
  if (!trigger) return null;
  return (
    <div className="fixed inset-0 z-[98] pointer-events-none">
      {emojis.map((emoji, i) => (
        <div
          key={i}
          className="absolute text-4xl animate-float"
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 60}%`,
            animationDelay: `${i * 0.3}s`,
            animationDuration: `${4 + Math.random() * 4}s`,
          }}
        >
          {emoji}
        </div>
      ))}
    </div>
  );
}

export function AuroraGlow({ color = "#6366f1" }: { color?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] animate-aurora" style={{ background: `${color}20` }} />
    </div>
  );
}
