import "./ai-orb.css";

interface AIOrbProps {
  size?: number;
}

export default function AIOrb({ size = 170 }: AIOrbProps) {
  const particleCount = 40;
  const particles = Array.from({ length: particleCount }, (_, i) => {
    const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
    const radius = 35 + Math.random() * 15;
    return {
      id: i,
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
      size: 2 + Math.random() * 3,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 2,
      opacity: 0.5 + Math.random() * 0.5,
    };
  });

  const connections = particles.slice(0, 12).map((p, i) => {
    const next = particles[(i + 1) % particles.length];
    return {
      id: i,
      x1: p.x,
      y1: p.y,
      x2: next.x,
      y2: next.y,
    };
  });

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* 1. Halo externo */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full animate-orb-pulse"
        style={{
          background:
            "radial-gradient(circle, rgba(124,54,192,0.55) 0%, rgba(58,14,107,0.28) 45%, transparent 70%)",
          filter: "blur(24px)",
        }}
      />

      {/* Esfera de partículas */}
      <div className="absolute inset-0 overflow-hidden rounded-full">
        {/* Base escura */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 32% 28%, #160824 0%, #080310 55%, #000000 100%)",
          }}
        />

        {/* Conexões entre partículas */}
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {connections.map((c) => (
            <line
              key={c.id}
              x1={`${c.x1}%`}
              y1={`${c.y1}%`}
              x2={`${c.x2}%`}
              y2={`${c.y2}%`}
              stroke="rgba(168,100,255,0.25)"
              strokeWidth="0.3"
              className="animate-neuron-pulse-line"
              style={{
                animationDuration: `${3 + Math.random() * 2}s`,
                animationDelay: `${Math.random()}s`,
              }}
            />
          ))}
        </svg>

        {/* Partículas */}
        {particles.map((p) => (
          <div
            key={p.id}
            aria-hidden
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
              background: `rgba(168,100,255,${p.opacity})`,
              boxShadow: `0 0 ${p.size * 2}px rgba(168,100,255,0.8)`,
              animation: `neuron-float-${(p.id % 3) + 1} ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}

        {/* Núcleo central */}
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-300/80"
          style={{
            boxShadow: "0 0 20px 8px rgba(168,100,255,0.9), 0 0 40px 12px rgba(124,54,192,0.6)",
            animation: "neuron-pulse 2.5s ease-in-out infinite",
          }}
        />

        {/* 3a. Fluxo horário */}
        <div
          aria-hidden
          className="absolute -inset-4 animate-orb-cw"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, #7c36c0 60deg, #b366ff 140deg, transparent 220deg, transparent 360deg)",
            filter: "blur(10px)",
            mixBlendMode: "screen",
            opacity: 0.85,
          }}
        />

        {/* 3b. Fluxo anti-horário */}
        <div
          aria-hidden
          className="absolute -inset-4 animate-orb-ccw"
          style={{
            background:
              "conic-gradient(from 90deg, transparent 0deg, #3a0e6b 80deg, #7c36c0 160deg, transparent 240deg, transparent 360deg)",
            filter: "blur(12px)",
            mixBlendMode: "screen",
            opacity: 0.7,
          }}
        />

        {/* 4. Realce líquido */}
        <div
          aria-hidden
          className="absolute inset-0 animate-orb-flow"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 70% 65%, rgba(168,100,255,0.85) 0%, transparent 60%)",
            filter: "blur(6px)",
            mixBlendMode: "screen",
          }}
        />

        {/* 5. Brilho especular */}
        <div
          aria-hidden
          className="absolute rounded-full"
          style={{
            top: "16%",
            right: "18%",
            width: "22%",
            height: "14%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.9), transparent 70%)",
            filter: "blur(4px)",
          }}
        />
      </div>
    </div>
  );
}
