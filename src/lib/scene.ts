import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { ChartNote } from './chart.ts';
import type { Judge } from './engine.ts';

export interface StageOptions {
  lanes: number;
  hue: number;
  bloom: boolean;
  bpm: number;
  bars: number[];
}

const HIGHWAY_W = 7.2;
const FAR = 70;
const NEAR = 1.6;
const MAX_HEADS = 260;
const MAX_BODIES = 64;
const MAX_PARTICLES = 900;
const MAX_RINGS = 14;

const JUDGE_COLOR: Record<Judge, number> = { perfect: 0xffd46b, great: 0x6be8ff, good: 0x8dffa8, miss: 0xff5a6e };

const luminance = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

/**
 * HSL colour dimmed so it is never brighter than a magenta of the same saturation and lightness.
 * Without this, yellow/green/cyan song hues wash out the stage under bloom.
 */
function stageColor(h: number, s: number, l: number): THREE.Color {
  const c = new THREE.Color().setHSL(((h % 1) + 1) % 1, s, l);
  const ref = luminance(new THREE.Color().setHSL(300 / 360, s, l));
  return c.multiplyScalar(Math.min(1, ref / Math.max(1e-6, luminance(c))));
}

function radialTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class Stage {
  readonly laneW: number;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  private composer: EffectComposer | null = null;
  private ro: ResizeObserver;
  private laneColors: THREE.Color[];

  private notes: ChartNote[] = [];
  private firstVisible = 0;
  private heads: THREE.Mesh[] = [];
  private bodies: THREE.Mesh[] = [];
  private headMats: THREE.MeshStandardMaterial[] = [];
  private bodyMats: THREE.MeshBasicMaterial[] = [];
  private bodyHotMats: THREE.MeshBasicMaterial[] = [];
  private missMat = new THREE.MeshStandardMaterial({ color: 0x3a3848, emissive: 0x18161f, roughness: 0.6, transparent: true, opacity: 0.55 });
  private missBodyMat = new THREE.MeshBasicMaterial({ color: 0x3a3848, transparent: true, opacity: 0.25, depthWrite: false });

  private receptors: THREE.Mesh[] = [];
  private beams: THREE.Mesh[] = [];
  private beamLevel: number[];
  private pressed: boolean[];
  private flash: number[];
  private barLines: THREE.Mesh[] = [];
  private highwayMat: THREE.ShaderMaterial;
  private skyMat: THREE.ShaderMaterial;
  private rails: THREE.MeshBasicMaterial[] = [];
  private lightBeams: THREE.Mesh[] = [];
  private stars: THREE.Points;

  private particles: THREE.Points;
  private pPos: Float32Array;
  private pCol: Float32Array;
  private pBase: Float32Array;
  private pVel: Float32Array;
  private pLife: Float32Array;
  private pMax: Float32Array;
  private pCursor = 0;
  private rings: { mesh: THREE.Mesh; life: number }[] = [];
  private ringCursor = 0;

  private lastFrame = performance.now();
  private elapsed = 0;
  private energy = 0;
  onLayout?: () => void;

  constructor(
    private el: HTMLElement,
    private o: StageOptions,
  ) {
    const L = o.lanes;
    this.laneW = HIGHWAY_W / L;
    this.beamLevel = new Array(L).fill(0);
    this.pressed = new Array(L).fill(false);
    this.flash = new Array(L).fill(0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, o.bloom ? 1.75 : 1.25));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    el.appendChild(this.renderer.domElement);

    const hue = o.hue / 360;
    this.laneColors = Array.from({ length: L }, (_, i) =>
      new THREE.Color().setHSL((hue - 0.09 + (0.18 * i) / Math.max(1, L - 1) + 1) % 1, 0.85, 0.6),
    );
    const accent = stageColor(hue, 0.8, 0.55);

    this.scene.fog = new THREE.Fog(stageColor(hue, 0.5, 0.03), 35, FAR + 10);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(2, 9, 6);
    this.scene.add(key);

    // Sky dome: dark zenith fading to a hue-tinted horizon glow.
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTop: { value: stageColor(hue + 0.05, 0.6, 0.02) },
        uHorizon: { value: stageColor(hue, 0.75, 0.16) },
        uPulse: { value: 0 },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 uTop; uniform vec3 uHorizon; uniform float uPulse; varying vec3 vDir;
        void main(){
          float h = vDir.y;
          float glow = exp(-abs(h - 0.02) * 9.0);
          vec3 col = mix(uTop, uHorizon, glow) * (1.0 + uPulse * 0.25);
          col *= smoothstep(-0.35, 0.0, h) * 0.85 + 0.15;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), this.skyMat));

    // Stars.
    const starPos = new Float32Array(1400 * 3);
    for (let i = 0; i < 1400; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI * 0.45;
      const r = 120 + Math.random() * 60;
      starPos.set([Math.cos(th) * Math.sin(ph) * r, Math.cos(ph) * r - 10, Math.sin(th) * Math.sin(ph) * r - 40], i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ size: 0.7, map: radialTexture(), transparent: true, depthWrite: false, opacity: 0.8, fog: false, blending: THREE.AdditiveBlending }),
    );
    this.scene.add(this.stars);

    // Stage light beams sweeping from above.
    const beamMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      fog: false,
      uniforms: { uColor: { value: accent.clone().lerp(new THREE.Color(1, 1, 1), 0.35) }, uI: { value: 0.12 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uI; varying vec2 vUv;
        void main(){ float a = pow(vUv.y, 1.6) * uI * (0.6 + 0.4 * sin(vUv.x * 6.2831 * 3.0)); gl_FragColor = vec4(uColor * a, a); }`,
    });
    const beamGeo = new THREE.CylinderGeometry(0.15, 5, 60, 32, 1, true);
    beamGeo.translate(0, -30, 0);
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(beamGeo, beamMat);
      b.position.set((i - 2.5) * 11, 34, -55 - (i % 2) * 8);
      b.userData.phase = i * 1.3;
      this.lightBeams.push(b);
      this.scene.add(b);
    }

    // Reflective-looking stage floor grid.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uColor: { value: accent } },
        vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `uniform vec3 uColor; varying vec3 vW;
          void main(){
            vec2 g = abs(fract(vW.xz / 4.0) - 0.5);
            float line = smoothstep(0.47, 0.5, max(g.x, g.y));
            float fade = exp(-length(vW.xz + vec2(0.0, 20.0)) / 45.0);
            float a = line * fade * 0.35;
            gl_FragColor = vec4(uColor * a, a);
          }`,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.6;
    this.scene.add(floor);

    // Highway with lane separators, fading into the distance.
    const len = FAR + NEAR;
    this.highwayMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uLanes: { value: L },
        uColor: { value: accent },
        uPulse: { value: 0 },
        uFarFrac: { value: FAR / len },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uLanes; uniform vec3 uColor; uniform float uPulse; uniform float uFarFrac; varying vec2 vUv;
        void main(){
          float x = vUv.x * uLanes;
          float e = min(fract(x), 1.0 - fract(x));
          float sep = smoothstep(0.035, 0.0, e) * 0.5;
          float edge = smoothstep(0.012, 0.0, min(vUv.x, 1.0 - vUv.x));
          float depth = vUv.y;
          float fade = 1.0 - smoothstep(0.55, 1.0, depth);
          float laneShade = mod(floor(x), 2.0) * 0.012;
          vec3 base = vec3(0.012, 0.012, 0.03) + uColor * (0.035 + laneShade + uPulse * 0.03);
          vec3 col = base + uColor * (sep * 0.9 + edge * 1.6);
          gl_FragColor = vec4(col, (0.88 + edge * 0.1) * fade);
        }`,
    });
    const highway = new THREE.Mesh(new THREE.PlaneGeometry(HIGHWAY_W, len), this.highwayMat);
    highway.rotation.x = -Math.PI / 2;
    highway.position.z = NEAR - len / 2;
    this.scene.add(highway);

    // Glowing side rails react to combo energy.
    for (const side of [-1, 1]) {
      const m = new THREE.MeshBasicMaterial({ color: accent.clone(), transparent: true, opacity: 0.8 });
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, FAR), m);
      rail.position.set((side * HIGHWAY_W) / 2, 0.02, -FAR / 2 + NEAR);
      this.rails.push(m);
      this.scene.add(rail);
    }

    // Hit line.
    const hitLine = new THREE.Mesh(
      new THREE.BoxGeometry(HIGHWAY_W, 0.03, 0.05),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.95, 0.85).multiplyScalar(1.6) }),
    );
    hitLine.position.set(0, 0.03, 0);
    this.scene.add(hitLine);

    // Notes, holds, receptors and lane beams.
    const headGeo = new RoundedBoxGeometry(this.laneW * 0.84, 0.2, 0.42, 3, 0.07);
    const bodyGeo = new THREE.BoxGeometry(this.laneW * 0.36, 0.06, 1);
    bodyGeo.translate(0, 0, -0.5);
    const beamGeoLane = new THREE.PlaneGeometry(this.laneW * 0.96, 14);
    beamGeoLane.translate(0, 7, 0);
    for (let i = 0; i < L; i++) {
      const c = this.laneColors[i];
      this.headMats.push(new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.85, roughness: 0.3, metalness: 0.2 }));
      this.bodyMats.push(new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(0.6), transparent: true, opacity: 0.55, depthWrite: false }));
      this.bodyHotMats.push(new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(1.8), transparent: true, opacity: 0.9, depthWrite: false }));

      const rec = new THREE.Mesh(
        new RoundedBoxGeometry(this.laneW * 0.86, 0.06, 0.46, 2, 0.03),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.22 }),
      );
      rec.position.set(this.laneX(i), 0.02, 0);
      this.receptors.push(rec);
      this.scene.add(rec);

      const beam = new THREE.Mesh(
        beamGeoLane,
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: { uColor: { value: c }, uI: { value: 0 } },
          vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: `uniform vec3 uColor; uniform float uI; varying vec2 vUv;
            void main(){ float side = 1.0 - pow(abs(vUv.x - 0.5) * 2.0, 3.0); float a = pow(1.0 - vUv.y, 2.2) * side * uI; gl_FragColor = vec4(uColor * a, a); }`,
        }),
      );
      beam.rotation.x = -Math.PI / 2;
      beam.position.set(this.laneX(i), 0.015, 0);
      this.beams.push(beam);
      this.scene.add(beam);
    }
    for (let i = 0; i < MAX_HEADS; i++) {
      const m = new THREE.Mesh(headGeo, this.headMats[0]);
      m.visible = false;
      this.heads.push(m);
      this.scene.add(m);
    }
    for (let i = 0; i < MAX_BODIES; i++) {
      const m = new THREE.Mesh(bodyGeo, this.bodyMats[0]);
      m.visible = false;
      this.bodies.push(m);
      this.scene.add(m);
    }
    const barMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false });
    for (let i = 0; i < 24; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(HIGHWAY_W, 0.005, 0.04), barMat);
      b.visible = false;
      this.barLines.push(b);
      this.scene.add(b);
    }

    // Particle pool for hit sparks.
    this.pPos = new Float32Array(MAX_PARTICLES * 3).fill(-999);
    this.pCol = new Float32Array(MAX_PARTICLES * 3);
    this.pBase = new Float32Array(MAX_PARTICLES * 3);
    this.pVel = new Float32Array(MAX_PARTICLES * 3);
    this.pLife = new Float32Array(MAX_PARTICLES);
    this.pMax = new Float32Array(MAX_PARTICLES).fill(1);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    this.particles = new THREE.Points(
      pg,
      new THREE.PointsMaterial({ size: 0.22, map: radialTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);

    const ringGeo = new THREE.RingGeometry(0.36, 0.46, 48);
    for (let i = 0; i < MAX_RINGS; i++) {
      const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      this.rings.push({ mesh, life: 0 });
      this.scene.add(mesh);
    }

    if (o.bloom) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.85, 0.55, 0.2));
      this.composer.addPass(new OutputPass());
    }

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(el);
    this.resize();
  }

  laneX(i: number) {
    return -HIGHWAY_W / 2 + this.laneW * (i + 0.5);
  }

  laneColor(i: number) {
    return '#' + this.laneColors[i].getHexString();
  }

  setNotes(notes: ChartNote[]) {
    this.notes = notes;
    this.firstVisible = 0;
  }

  private resize() {
    const w = this.el.clientWidth;
    const h = this.el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // Pull the camera back on narrow screens so the whole highway fits.
    const halfW = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * aspect * 8.4;
    const k = Math.max(1, (HIGHWAY_W / 2 + 0.6) / halfW);
    // Frames the hit line at ~70% of the screen height, leaving room for the keyboard below.
    this.camera.position.set(0, 5.2 * k, 6.6 * k);
    this.camera.lookAt(0, 0, -4);
    this.camera.updateProjectionMatrix();
    this.onLayout?.();
  }

  /** Screen-space positions (CSS px) of each lane at the hit line. */
  laneScreen(): { x: number; y: number; w: number }[] {
    const w = this.el.clientWidth;
    const h = this.el.clientHeight;
    const proj = (x: number, z: number) => {
      const v = new THREE.Vector3(x, 0, z).project(this.camera);
      return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h };
    };
    return Array.from({ length: this.o.lanes }, (_, i) => {
      const c = proj(this.laneX(i), 0.75);
      const a = proj(this.laneX(i) - this.laneW / 2, 0.75);
      return { x: c.x, y: c.y, w: (c.x - a.x) * 2 };
    });
  }

  setPressed(lane: number, down: boolean) {
    this.pressed[lane] = down;
    if (down) this.beamLevel[lane] = Math.max(this.beamLevel[lane], 0.55);
  }

  hit(lane: number, judge: Judge) {
    if (judge === 'miss') {
      this.flash[lane] = -1;
      return;
    }
    this.flash[lane] = 1;
    this.beamLevel[lane] = 1;
    const color = new THREE.Color(JUDGE_COLOR[judge]).lerp(this.laneColors[lane], 0.35);
    const count = judge === 'perfect' ? 30 : judge === 'great' ? 20 : 12;
    this.burst(this.laneX(lane), 0.15, 0, color, count, judge === 'perfect' ? 1.25 : 1);
    const r = this.rings[this.ringCursor++ % MAX_RINGS];
    r.life = 1;
    r.mesh.visible = true;
    r.mesh.position.set(this.laneX(lane), 0.06, 0);
    (r.mesh.material as THREE.MeshBasicMaterial).color.copy(color);
  }

  holdSpark(lane: number) {
    this.burst(this.laneX(lane), 0.15, 0, this.laneColors[lane], 2, 0.6);
  }

  private burst(x: number, y: number, z: number, color: THREE.Color, count: number, power: number) {
    for (let k = 0; k < count; k++) {
      const i = this.pCursor++ % MAX_PARTICLES;
      const a = Math.random() * Math.PI * 2;
      const sp = (1.2 + Math.random() * 3.2) * power;
      this.pPos.set([x + (Math.random() - 0.5) * this.laneW * 0.6, y, z], i * 3);
      this.pVel.set([Math.cos(a) * sp * 0.6, 2.5 + Math.random() * 4 * power, Math.sin(a) * sp * 0.4 - 0.6], i * 3);
      this.pBase.set([color.r * 1.6, color.g * 1.6, color.b * 1.6], i * 3);
      this.pMax[i] = this.pLife[i] = 0.45 + Math.random() * 0.45;
    }
  }

  /** Sets how "hot" the stage looks (0–1), driven by the combo. */
  setEnergy(e: number) {
    this.energy = e;
  }

  render(songTime: number, unitsPerSec: number) {
    const nowMs = performance.now();
    const dt = Math.min(0.05, (nowMs - this.lastFrame) / 1000);
    this.lastFrame = nowMs;
    this.elapsed += dt;

    // Beat pulse.
    const beatLen = 60 / Math.max(40, this.o.bpm);
    const phase = songTime >= 0 ? (((songTime - (this.o.bars[0] ?? 0)) % beatLen) + beatLen) % beatLen / beatLen : 1;
    const pulse = Math.exp(-phase * 5);
    this.highwayMat.uniforms.uPulse.value = pulse;
    this.skyMat.uniforms.uPulse.value = pulse * (0.4 + this.energy);
    for (const m of this.rails) m.opacity = 0.35 + 0.35 * this.energy + pulse * 0.3;
    for (const b of this.lightBeams) {
      const p = b.userData.phase as number;
      b.rotation.z = Math.sin(this.elapsed * 0.35 + p) * 0.45;
      b.rotation.x = Math.cos(this.elapsed * 0.27 + p) * 0.2 + 0.25;
    }
    (this.lightBeams[0].material as THREE.ShaderMaterial).uniforms.uI.value = 0.06 + 0.12 * this.energy + pulse * 0.05;
    this.stars.rotation.y = this.elapsed * 0.004;

    this.renderNotes(songTime, unitsPerSec);
    this.renderBars(songTime, unitsPerSec);

    // Receptors, beams, flashes.
    for (let i = 0; i < this.o.lanes; i++) {
      const target = this.pressed[i] ? 0.4 : 0;
      this.beamLevel[i] += (target - this.beamLevel[i]) * Math.min(1, dt * (this.pressed[i] ? 18 : 7));
      (this.beams[i].material as THREE.ShaderMaterial).uniforms.uI.value = this.beamLevel[i];
      const rec = this.receptors[i];
      const mat = rec.material as THREE.MeshBasicMaterial;
      const f = this.flash[i];
      if (f < 0) mat.color.setRGB(1, 0.25, 0.3);
      else mat.color.copy(this.laneColors[i]).multiplyScalar(1 + f * 1.5);
      mat.opacity = 0.22 + (this.pressed[i] ? 0.35 : 0) + Math.abs(f) * 0.4;
      rec.scale.setScalar(1 + Math.max(0, f) * 0.12);
      this.flash[i] = f > 0 ? Math.max(0, f - dt * 4) : Math.min(0, f + dt * 3);
    }

    // Particles.
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.pLife[i] <= 0) continue;
      this.pLife[i] -= dt;
      const k = i * 3;
      if (this.pLife[i] <= 0) {
        this.pPos[k + 1] = -999;
        continue;
      }
      this.pVel[k + 1] -= 9 * dt;
      this.pPos[k] += this.pVel[k] * dt;
      this.pPos[k + 1] += this.pVel[k + 1] * dt;
      this.pPos[k + 2] += this.pVel[k + 2] * dt;
      const fade = this.pLife[i] / this.pMax[i];
      this.pCol[k] = this.pBase[k] * fade;
      this.pCol[k + 1] = this.pBase[k + 1] * fade;
      this.pCol[k + 2] = this.pBase[k + 2] * fade;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;

    for (const r of this.rings) {
      if (r.life <= 0) continue;
      r.life -= dt * 2.6;
      if (r.life <= 0) {
        r.mesh.visible = false;
        continue;
      }
      r.mesh.scale.setScalar(1 + (1 - r.life) * 1.1);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = r.life * 0.9;
    }

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  private renderNotes(now: number, ups: number) {
    const visibleSec = FAR / ups;
    let h = 0;
    let b = 0;
    const notes = this.notes;
    while (this.firstVisible < notes.length) {
      const n = notes[this.firstVisible];
      const gone = n.state === 'done' || (n.state === 'missed' && n.end < now - 0.6);
      if (gone && n.end < now - 0.1) this.firstVisible++;
      else break;
    }
    for (let i = this.firstVisible; i < notes.length && h < MAX_HEADS; i++) {
      const n = notes[i];
      if (n.t - now > visibleSec) break;
      if (n.state === 'done') continue;
      if (n.state === 'missed' && n.end < now - 0.6) continue;
      const x = this.laneX(n.lane);
      const holding = n.state === 'holding';
      const headZ = holding ? 0 : -(n.t - now) * ups;
      const missed = n.state === 'missed';

      if (n.hold && b < MAX_BODIES) {
        const endZ = Math.max(-FAR, -(n.end - now) * ups);
        const length = headZ - endZ;
        if (length > 0.01) {
          const body = this.bodies[b++];
          body.visible = true;
          body.material = missed ? this.missBodyMat : holding ? this.bodyHotMats[n.lane] : this.bodyMats[n.lane];
          body.position.set(x, 0.07, headZ);
          body.scale.set(holding ? 1.25 : 1, 1, length);
        }
        if (holding && Math.random() < 0.5) this.holdSpark(n.lane);
      }
      if (headZ < -FAR || headZ > NEAR + 1) continue;
      const head = this.heads[h++];
      head.visible = true;
      head.material = missed ? this.missMat : this.headMats[n.lane];
      head.position.set(x, holding ? 0.14 : 0.12, headZ);
      head.scale.setScalar(holding ? 1.08 : 1);
    }
    for (; h < MAX_HEADS && this.heads[h].visible; h++) this.heads[h].visible = false;
    for (; b < MAX_BODIES && this.bodies[b].visible; b++) this.bodies[b].visible = false;
  }

  private renderBars(now: number, ups: number) {
    let k = 0;
    for (const t of this.o.bars) {
      const z = -(t - now) * ups;
      if (z > NEAR) continue;
      if (z < -FAR || k >= this.barLines.length) break;
      const line = this.barLines[k++];
      line.visible = true;
      line.position.set(0, 0.01, z);
    }
    for (; k < this.barLines.length; k++) this.barLines[k].visible = false;
  }

  dispose() {
    this.ro.disconnect();
    this.scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) mat.dispose();
    });
    this.composer?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
