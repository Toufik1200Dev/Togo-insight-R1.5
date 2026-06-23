"use client";

import { useEffect, useRef } from "react";

/**
 * Lightweight self-contained "network" particle background (no external CDN),
 * matching the V2 particles.js look: drifting cyan nodes linked by faint lines,
 * with a grab effect near the cursor.
 */
export default function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = ["#ffffff", "#22d3ee", "#60a5fa"];
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const mouse = { x: -9999, y: -9999 };

    const count = Math.min(110, Math.floor((width * height) / 16000));
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 2 + 1,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = 0.55;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = "#60a5fa";
            ctx.globalAlpha = (1 - dist / 140) * 0.25;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mdist = Math.hypot(mdx, mdy);
        if (mdist < 150) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = "#60a5fa";
          ctx.globalAlpha = (1 - mdist / 150) * 0.5;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="particles-canvas" aria-hidden="true" />;
}

/** Decorative floating tech glyphs (Font Awesome). Pure markup. */
export function FloatingTech() {
  const items = [
    { delay: "0s", size: "60px", top: "15%", left: "5%", icon: "fa-satellite" },
    { delay: "3s", size: "70px", top: "70%", left: "80%", icon: "fa-network-wired" },
    { delay: "6s", size: "50px", top: "40%", left: "90%", icon: "fa-tower-broadcast" },
    { delay: "9s", size: "65px", top: "80%", left: "30%", icon: "fa-microchip" },
    { delay: "12s", size: "55px", top: "25%", left: "70%", icon: "fa-wifi" },
  ];
  return (
    <div className="floating-tech" aria-hidden="true">
      {items.map((it, i) => (
        <div
          key={i}
          className="tech-element"
          style={
            {
              "--delay": it.delay,
              "--size": it.size,
              "--top": it.top,
              "--left": it.left,
            } as React.CSSProperties
          }
        >
          <i className={`fas ${it.icon}`} />
        </div>
      ))}
    </div>
  );
}
