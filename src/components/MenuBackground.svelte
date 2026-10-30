<script lang="ts">
  import { onMount } from 'svelte';

  let { hue = 42 }: { hue?: number } = $props();
  let canvas: HTMLCanvasElement;

  onMount(() => {
    const ctx = canvas.getContext('2d')!;
    let w = 0;
    let h = 0;
    let current = hue;
    let raf = 0;
    let last = performance.now();
    const dots = Array.from({ length: 42 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.012 + Math.random() * 0.05,
      speed: 0.006 + Math.random() * 0.014,
      phase: Math.random() * Math.PI * 2,
      dh: (Math.random() - 0.5) * 60,
    }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      w = canvas.width = Math.floor(innerWidth * dpr);
      h = canvas.height = Math.floor(innerHeight * dpr);
    };
    resize();
    addEventListener('resize', resize);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Ease toward the target hue along the shortest path around the wheel.
      current += ((((hue - current) % 360) + 540) % 360 - 180) * Math.min(1, dt * 2.5);

      const bg = ctx.createRadialGradient(w * 0.5, h * 1.1, 0, w * 0.5, h * 1.1, Math.max(w, h) * 1.1);
      bg.addColorStop(0, `hsl(${current} 55% 16%)`);
      bg.addColorStop(0.45, `hsl(${current + 20} 40% 7%)`);
      bg.addColorStop(1, '#07060d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'lighter';
      const m = Math.min(w, h);
      for (const d of dots) {
        d.y -= d.speed * dt;
        if (d.y < -0.1) {
          d.y = 1.1;
          d.x = Math.random();
        }
        const tw = 0.55 + 0.45 * Math.sin(now / 1400 + d.phase);
        const x = (d.x + Math.sin(now / 5000 + d.phase) * 0.02) * w;
        const y = d.y * h;
        const r = d.r * m;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `hsl(${current + d.dh} 85% 70% / ${0.22 * tw})`);
        g.addColorStop(1, `hsl(${current + d.dh} 85% 60% / 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
    };
  });
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
  canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }
</style>
