"use client"

import type { ReactNode } from "react"

interface GlowingShadowProps {
  children: ReactNode
  className?: string
  borderRadius?: number
}

/**
 * Wrapper que aplica uma borda animada (hue + glow rotativo) ao redor do conteúdo.
 * O efeito é visível apenas em desktop (>= 768px); em mobile fica transparente.
 */
export function GlowingShadow({
  children,
  className = "",
  borderRadius = 16,
}: GlowingShadowProps) {
  return (
    <div className={`glow-fx-parent ${className}`} style={{ "--gf-radius": `${borderRadius}px` } as React.CSSProperties}>
      <div className="glow-fx">
        <span className="gf-glow"></span>
      </div>
      <div className="glow-fx-content">{children}</div>
      <style>{`
        @property --gf-hue { syntax: "<number>"; inherits: true; initial-value: 0; }
        @property --gf-rotate { syntax: "<number>"; inherits: true; initial-value: 0; }
        @property --gf-glow-translate-y { syntax: "<number>"; inherits: true; initial-value: 0; }
        @property --gf-bg-size { syntax: "<number>"; inherits: true; initial-value: 1; }
        @property --gf-glow-blur { syntax: "<number>"; inherits: true; initial-value: 6; }
        @property --gf-glow-opacity { syntax: "<number>"; inherits: true; initial-value: 1; }
        @property --gf-glow-scale { syntax: "<number>"; inherits: true; initial-value: 1.5; }

        .glow-fx-parent {
          --gf-border-width: 4px;
          --gf-animation-speed: 7s;
          --gf-hue: 0;
          --gf-bg-size: 1;
          --gf-rotate: 0;
          --gf-scale-factor: 1;
          --gf-glow-blur: 8;
          --gf-glow-opacity: 1;
          --gf-glow-scale: 1.5;

          position: relative;
          display: block;
          border-radius: var(--gf-radius, 16px);
          box-shadow: 0 20px 60px -20px rgba(0,0,0,0.8);
        }

        /* camada que gera a borda animada */
        .glow-fx,
        .glow-fx::before,
        .glow-fx::after {
          content: "";
          display: block;
          position: absolute;
          border-radius: var(--gf-radius, 16px);
        }

        .glow-fx {
          inset: calc(var(--gf-border-width) * -1);
          z-index: 0;
          pointer-events: none;
        }

        /* gradiente hue rotativo (a própria "borda") */
        .glow-fx::before {
          inset: 0;
          background: hsl(0deg 0% 14%) radial-gradient(
            45% 45% at 0% 0%,
            hsl(calc(var(--gf-hue) * 1deg) 100% 75%)  0%,
            hsl(calc(var(--gf-hue) * 1deg) 100% 55%)  22%,
            hsl(calc(var(--gf-hue) * 1deg) 100% 40%)  45%,
            transparent 100%
          );
          animation: gf-rotate-bg var(--gf-animation-speed) linear infinite,
                     gf-hue-animation var(--gf-animation-speed) linear infinite;
        }

        /* blob de glow rotativo */
        .glow-fx .gf-glow {
          display: block;
          position: absolute;
          width: 26%;
          aspect-ratio: 1;
          right: -7%;
          top: -7%;
          z-index: 1;
          pointer-events: none;
          border-radius: 50%;
          animation: gf-rotate-out var(--gf-animation-speed) linear infinite;
        }

        .glow-fx .gf-glow::after {
          content: "";
          display: block;
          filter: blur(calc(var(--gf-glow-blur) * 10px));
          width: 100%;
          aspect-ratio: 1;
          background: hsl(calc(var(--gf-hue) * 1deg) 100% 60%);
          border-radius: 50%;
          animation: gf-hue-animation var(--gf-animation-speed) linear infinite;
          opacity: var(--gf-glow-opacity);
          transform: scale(var(--gf-glow-scale));
        }

        /* conteúdo por cima, com fundo sólido */
        .glow-fx-content {
          position: relative;
          z-index: 2;
          border-radius: calc(var(--gf-radius, 16px) - var(--gf-border-width));
          background: hsl(0 0% 4%);
        }

        .glow-fx-parent:hover .glow-fx::before {
          --gf-bg-size: 6;
        }
        .glow-fx-parent:hover .glow-fx .gf-glow {
          --gf-glow-blur: 2.5;
          --gf-glow-opacity: 0.8;
          --gf-glow-scale: 2;
        }

        @keyframes gf-rotate-bg {
          0%   { --gf-bg-x: 0;   --gf-bg-y: 0; }
          25%  { --gf-bg-x: 100; --gf-bg-y: 0; }
          50%  { --gf-bg-x: 100; --gf-bg-y: 100; }
          75%  { --gf-bg-x: 0;   --gf-bg-y: 100; }
          100% { --gf-bg-x: 0;   --gf-bg-y: 0; }
        }

        @keyframes gf-rotate-out {
          from { transform: rotate(0deg)    translate(var(--gf-radius, 16px)) rotate(0deg); }
          to   { transform: rotate(360deg)  translate(var(--gf-radius, 16px)) rotate(-360deg); }
        }

        @keyframes gf-hue-animation {
          0%   { --gf-hue: 0; }
          100% { --gf-hue: 360; }
        }
      `}</style>
    </div>
  )
}
