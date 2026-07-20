import { useEffect, useRef } from "react";

interface Particle { x: number; y: number; vx: number; vy: number; size: number; opacity: number; }

export default function SpatialBackground({ color1: _color1, color2: _color2 }: { color1?: string; color2?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const initParticles = () => {
      const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 20000));
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.2,
      }));
    };
    initParticles();

    const handleMouse = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", handleMouse);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;

      particles.forEach((p) => {
        if (!reduceMotion) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

          const dx = mouseRef.current.x - p.x;
          const dy = mouseRef.current.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const force = (150 - dist) / 150;
            p.x -= (dx / dist) * force * 0.5;
            p.y -= (dy / dist) * force * 0.5;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 102, 241, ${p.opacity})`;
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${(1 - dist / 120) * 0.15})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-950">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-slate-950 to-accent-900/10" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-[120px] animate-aurora" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-600/10 rounded-full blur-[120px] animate-aurora" style={{ animationDelay: "2s" }} />
    </div>
  );
}

export { SpatialBackground };

export function GlowOrb({ color, size, className }: { color: string; size: number; className?: string }) {
  return (
    <div
      className={`absolute rounded-full blur-[120px] animate-aurora ${className || ""}`}
      style={{ width: size, height: size, background: `${color}15` }}
    />
  );
}
