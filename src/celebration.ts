export function celebrate(canvas: HTMLCanvasElement): () => void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const context = canvas.getContext('2d');
  if (!context) return () => {};
  canvas.hidden = false;
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = width * ratio; canvas.height = height * ratio;
  context.scale(ratio, ratio);
  const colors = ['#8baf72', '#d3bc77', '#668e7a', '#d49f8a', '#a6c2ad'];
  const pieces = Array.from({ length: 70 }, (_, i) => ({ x: Math.random() * width, y: -Math.random() * height * .6,
    speed: 45 + Math.random() * 75, drift: (Math.random() - .5) * 30, turn: Math.random() * 6,
    color: colors[i % colors.length], size: 3 + Math.random() * 4 }));
  let frame = 0;
  const start = performance.now();
  let previous = start;
  const stop = () => { cancelAnimationFrame(frame); context.clearRect(0, 0, width, height); canvas.hidden = true; };
  const draw = (now: number) => {
    const elapsed = (now - start) / 1000;
    if (elapsed >= 3.5) { stop(); return; }
    const delta = Math.min((now - previous) / 1000, .05);
    previous = now;
    context.clearRect(0, 0, width, height);
    context.globalAlpha = Math.min(1, 3.5 - elapsed);
    for (const p of pieces) {
      p.x += p.drift * delta; p.y += p.speed * delta; p.turn += delta * 2;
      context.save(); context.translate(p.x, p.y); context.rotate(p.turn); context.fillStyle = p.color;
      context.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * .55); context.restore();
    }
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return stop;
}
