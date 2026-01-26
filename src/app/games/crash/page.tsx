"use client";

import { useEffect, useRef, useState } from "react";
import { useWalletBalance } from "@/lib/useWalletBalance";

export default function CrashGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [multiplier, setMultiplier] = useState(1.0);
  const [running, setRunning] = useState(false);
  const wallet = useWalletBalance();

  useEffect(() => {
    if (!running) return;
    let raf: number;
    const start = performance.now();

    function tick(t: number) {
      const elapsed = (t - start) / 1000;
      const next = 1 + elapsed * 0.6;
      setMultiplier(Number(next.toFixed(2)));

      draw(next);

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  function draw(m: number) {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(0, c.height);
    ctx.lineTo(c.width, c.height - m * 60);
    ctx.stroke();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-black mb-4">Crash</h1>

      <canvas ref={canvasRef} width={800} height={400} className="bg-black rounded-xl mb-4" />

      <div className="flex items-center gap-4">
        <button
          onClick={() => setRunning(true)}
          disabled={running}
          className="px-6 py-3 bg-green-500 text-black font-bold rounded"
        >
          Apostar
        </button>
        <button
          onClick={() => setRunning(false)}
          className="px-6 py-3 bg-red-500 text-black font-bold rounded"
        >
          Cash Out
        </button>
        <div className="text-xl font-mono">{multiplier.toFixed(2)}x</div>
      </div>

      <div className="mt-4 text-sm text-zinc-400">
        Cashback aplicado automáticamente si pierdes (según tu último depósito).
      </div>
    </div>
  );
}