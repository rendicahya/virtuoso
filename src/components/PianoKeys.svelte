<script lang="ts">
  import { onMount } from 'svelte';
  import { isBlackKey } from '../lib/theory.ts';

  let { low, high, hue }: { low: number; high: number; hue: number } = $props();

  const GLOW = 26;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let w = 0;
  let h = 0;
  let dpr = 1;
  /** Per-key glow level, decays smoothly after release. */
  const level = new Float32Array(128);
  const kind = new Uint8Array(128);

  const whites = $derived.by(() => {
    const out: number[] = [];
    for (let m = low; m <= high; m++) if (!isBlackKey(m)) out.push(m);
    return out;
  });

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    const ro = new ResizeObserver(() => {
      dpr = Math.min(devicePixelRatio, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  });

  /** Draws the keyboard; `player` maps midi → song time the key stops glowing. */
  export function draw(player: Map<number, number>, auto: Set<number>, now: number, dt: number) {
    if (!ctx || !w) return;
    for (let m = low; m <= high; m++) {
      const until = player.get(m);
      if (until !== undefined && until > now) {
        level[m] = 1;
        kind[m] = 1;
      } else if (auto.has(m)) {
        level[m] = Math.max(level[m], 0.85);
        if (level[m] >= 0.85) kind[m] = 2;
      } else level[m] = Math.max(0, level[m] - dt * 5);
    }
    for (const [m, until] of player) if (until <= now) player.delete(m);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const kh = h - GLOW;
    const ww = w / whites.length;
    const gold = (a: number) => `rgba(255, 207, 107, ${a})`;
    const tint = (a: number, l = 66) => `hsla(${hue}, 85%, ${l}%, ${a})`;
    const color = (m: number, a: number) => (kind[m] === 1 ? gold(a) : tint(a));

    // Rising glow above active keys.
    const xOf = new Map<number, [number, number]>();
    whites.forEach((m, i) => xOf.set(m, [i * ww, ww]));
    for (let m = low; m <= high; m++) {
      if (!isBlackKey(m)) continue;
      const left = xOf.get(m - 1);
      if (left) xOf.set(m, [left[0] + ww - ww * 0.3, ww * 0.6]);
    }
    for (let m = low; m <= high; m++) {
      const l = level[m];
      if (l <= 0.01) continue;
      const [x, kw] = xOf.get(m)!;
      const g = ctx.createLinearGradient(0, GLOW, 0, 0);
      g.addColorStop(0, color(m, 0.55 * l));
      g.addColorStop(1, color(m, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x + 1, 0, kw - 2, GLOW);
    }

    // White keys.
    whites.forEach((m, i) => {
      const x = i * ww;
      const l = level[m];
      const g = ctx.createLinearGradient(0, GLOW, 0, h);
      g.addColorStop(0, '#d9d3c7');
      g.addColorStop(1, '#fbf8f1');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x + 0.5, GLOW, ww - 1, kh, [0, 0, 4, 4]);
      ctx.fill();
      if (l > 0.01) {
        ctx.fillStyle = color(m, 0.85 * l);
        ctx.fill();
      }
    });

    // Black keys.
    for (let m = low; m <= high; m++) {
      if (!isBlackKey(m) || !xOf.has(m)) continue;
      const [x, bw] = xOf.get(m)!;
      const l = level[m];
      const g = ctx.createLinearGradient(0, GLOW, 0, GLOW + kh * 0.62);
      g.addColorStop(0, '#1a1822');
      g.addColorStop(1, '#2e2b38');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x, GLOW, bw, kh * 0.62, [0, 0, 3, 3]);
      ctx.fill();
      if (l > 0.01) {
        ctx.fillStyle = kind[m] === 1 ? gold(0.9 * l) : tint(0.85 * l, 55);
        ctx.fill();
      }
    }

    // Felt strip.
    ctx.fillStyle = `hsla(${hue}, 60%, 35%, 0.9)`;
    ctx.fillRect(0, GLOW - 2, w, 3);
  }
</script>

<canvas bind:this={canvas} class="piano" aria-hidden="true"></canvas>

<style>
  .piano {
    position: absolute;
    left: 50%;
    bottom: max(8px, env(safe-area-inset-bottom));
    transform: translateX(-50%);
    width: min(1100px, calc(100% - 32px));
    height: clamp(64px, 11vh, 96px);
    pointer-events: none;
    filter: drop-shadow(0 -6px 24px rgba(0, 0, 0, 0.5));
  }
</style>
