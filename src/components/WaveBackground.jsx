// src/components/WaveBackground.jsx
import React, { useEffect, useRef } from 'react';

const WaveBackground = ({ isPlaying }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height, animationFrameId;
    let time = 0;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    class WaveLine {
      constructor(c, s, a, o) { Object.assign(this, {c, s, a, o}); }
      draw(t) {
        ctx.beginPath();
        ctx.strokeStyle = this.c;
        ctx.lineWidth = 1;
        const freq = 0.001;
        const activeAmp = isPlaying ? this.a * 1.3 : this.a;
        const activeSpeed = isPlaying ? this.s * 1.5 : this.s;

        for (let x = 0; x <= width; x += 10) {
          const y = height / 2 + Math.sin(x * freq + (t * activeSpeed) + this.o) * activeAmp * Math.sin((t * activeSpeed) * 0.5);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    const lines = [
      new WaveLine(`rgba(0, 74, 173, 0.8)`, 0.03, 160, 0),
      new WaveLine(`rgba(99, 102, 241, 0.4)`, 0.0225, 240, 1.5),
      new WaveLine(`rgba(255, 255, 255, 0.2)`, 0.015, 128, 3)
    ];

    const render = () => {
      time += 1;
      ctx.clearRect(0, 0, width, height);
      lines.forEach(l => l.draw(time));
      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener('resize', resize);
    resize();
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[radial-gradient(circle_at_center,#001a40_0%,#000_100%)]">
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-60" />
    </div>
  );
};

export default WaveBackground;