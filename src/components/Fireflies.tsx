import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export interface FirefliesRef {
  burst: (x: number, y: number) => void;
  /** Draw the swarm gently towards a point on screen, or release it with `null`. */
  gather: (point: { x: number; y: number } | null) => void;
}

type Particle = { x: number, y: number, vx: number, vy: number, size: number, op: number, targetOp: number, life: number, maxLife: number };

// Peach gold
const COLOR = "229, 190, 165";
// Radius of the soft halo around each firefly, in CSS pixels.
const GLOW_RADIUS = 10;
// Phones render at 3x; beyond 2x the extra pixels are invisible at this size
// but still cost fill rate every frame.
const MAX_DPR = 2;
// While gathering, fireflies within this distance are pulled in, and settle
// on a ring this far out rather than at the point itself.
const GATHER_REACH = 900;
const GATHER_RING = 180;
const GATHER_PULL = 0.012;
// The simulation constants below were tuned per 60 Hz frame.
const FRAME_MS = 1000 / 60;

// Roughly one firefly per 12k px² keeps density even across screen sizes.
const particleCountFor = (width: number, height: number) =>
  Math.round(Math.min(60, Math.max(30, (width * height) / 12000)));

/** Pre-rendered halo, drawn with `drawImage` instead of per-particle `shadowBlur`. */
function createGlowSprite(dpr: number) {
  const sprite = document.createElement("canvas");
  const size = Math.ceil(GLOW_RADIUS * 2 * dpr);
  sprite.width = sprite.height = size;
  const ctx = sprite.getContext("2d");
  if (ctx) {
    const r = size / 2;
    const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
    // Stops matched by eye against the old `shadowBlur = 10`, which spread
    // the tiny core's light thinly: the halo is faint, not a bright disc.
    gradient.addColorStop(0, `rgba(${COLOR}, 0.18)`);
    gradient.addColorStop(0.4, `rgba(${COLOR}, 0.06)`);
    gradient.addColorStop(0.75, `rgba(${COLOR}, 0.015)`);
    gradient.addColorStop(1, `rgba(${COLOR}, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  return sprite;
}

export const Fireflies = forwardRef<FirefliesRef, {}>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const reducedMotion = useRef(false);
  const gatherPoint = useRef<{ x: number; y: number } | null>(null);

  useImperativeHandle(ref, () => ({
    gather: (point) => {
      gatherPoint.current = point;
    },
    burst: (x, y) => {
      if (reducedMotion.current) return;
      particles.current.forEach(p => {
        const dx = p.x - x;
        const dy = p.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Interaction radius (burst effect)
        if (dist < 200) {
          const force = (200 - dist) / 200;
          // Apply outward repulsive force
          // A particle can be exactly underneath the pointer, so avoid
          // dividing by zero and turning its velocity into NaN.
          if (dist > 0) {
            p.vx += (dx / dist) * force * 15;
            p.vy += (dy / dist) * force * 15;
          } else {
            p.vx += force * 15;
          }
          // Flare up opacity
          p.op = 1;
          p.targetOp = 0.8;
        }
      });
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = 1;
    let glow = createGlowSprite(dpr);

    const createParticle = (initial = false): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 1.5 + 0.8,
      op: initial ? Math.random() * 0.4 + 0.1 : 0,
      targetOp: Math.random() * 0.4 + 0.1,
      life: initial ? Math.random() * 500 : 0,
      maxLife: 400 + Math.random() * 400,
    });

    const setCanvasSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const nextDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      if (nextDpr !== dpr) {
        dpr = nextDpr;
        glow = createGlowSprite(dpr);
      }
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      // Reset the transform explicitly so repeated resizes never compound
      // the device-pixel-ratio scale.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";

      // Rotating a phone changes the area, so top up or trim the swarm.
      const count = particleCountFor(width, height);
      while (particles.current.length < count) particles.current.push(createParticle(true));
      particles.current.length = count;
    };

    particles.current = [];
    setCanvasSize();

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = `rgb(${COLOR})`;
      particles.current.forEach(p => {
        if (p.op <= 0.005) return;
        // The halo is a touch stronger than the core, as the old shadow was.
        ctx.globalAlpha = Math.min(1, p.op * 1.5);
        ctx.drawImage(glow, p.x - GLOW_RADIUS, p.y - GLOW_RADIUS, GLOW_RADIUS * 2, GLOW_RADIUS * 2);
        ctx.globalAlpha = p.op;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };

    const step = (dt: number) => {
      // Frame-rate independent easing: the per-frame factors are raised to
      // the number of 60 Hz frames elapsed, so 120 Hz screens aren't faster.
      const fastFriction = Math.pow(0.92, dt);
      const gentleFriction = Math.pow(0.98, dt);
      const fade = 1 - Math.pow(0.95, dt);

      particles.current.forEach(p => {
        // Move
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const g = gatherPoint.current;
        if (g) {
          const dx = g.x - p.x;
          const dy = g.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > GATHER_RING && dist < GATHER_REACH) {
            p.vx += (dx / dist) * GATHER_PULL * dt;
            p.vy += (dy / dist) * GATHER_PULL * dt;
            p.targetOp = Math.max(p.targetOp, 0.45);
          }
        }

        const speedSq = p.vx * p.vx + p.vy * p.vy;

        // High friction when moving fast (from burst)
        if (speedSq > 2) {
          p.vx *= fastFriction;
          p.vy *= fastFriction;
        } else {
          // Gentle friction
          p.vx *= gentleFriction;
          p.vy *= gentleFriction;
          // Brownian motion for idle hovering
          p.vx += (Math.random() - 0.5) * 0.1 * dt;
          p.vy += (Math.random() - 0.5) * 0.1 * dt;
        }

        // Wrap edges to keep them in view
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        // Twinkle effect & lifecycle
        p.life += dt;
        if (p.life > p.maxLife) {
          p.targetOp = 0;
          p.op += (p.targetOp - p.op) * fade;
          if (p.op < 0.01) {
            Object.assign(p, createParticle(false));
          }
        } else {
          p.op += (p.targetOp - p.op) * fade;
          if (Math.random() < 0.02 * dt) {
            p.targetOp = Math.random() * 0.5 + 0.1;
          }
        }
      });
    };

    let animationFrameId = 0;
    let lastTime = 0;

    const render = (time: number) => {
      // Clamp long gaps (e.g. returning to a background tab) so nothing jumps.
      const dt = lastTime ? Math.min((time - lastTime) / FRAME_MS, 3) : 1;
      lastTime = time;
      step(dt);
      draw();
      animationFrameId = requestAnimationFrame(render);
    };

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    // With reduced motion the fireflies stay as a still, softly lit field.
    const start = () => {
      cancelAnimationFrame(animationFrameId);
      reducedMotion.current = motionQuery.matches;
      if (reducedMotion.current) {
        draw();
      } else {
        lastTime = 0;
        animationFrameId = requestAnimationFrame(render);
      }
    };

    const handleResize = () => {
      setCanvasSize();
      if (reducedMotion.current) draw();
    };

    window.addEventListener("resize", handleResize);
    motionQuery.addEventListener("change", start);
    start();

    return () => {
      window.removeEventListener("resize", handleResize);
      motionQuery.removeEventListener("change", start);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-40 transition-opacity duration-1000" />;
});
