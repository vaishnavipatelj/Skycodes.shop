/* SkyCodes.Shop — hero scene.
   A small perspective renderer: the brand ribbon rebuilt as folded quads in 3D,
   over a receding grid. No library, no CDN, ~6kb. Runs at 60fps on a mid phone,
   pauses when off screen or when the tab is hidden, and holds a single static
   frame when the visitor has asked for reduced motion. */
window.SkyScene = (() => {

  const RIBBON = [
    [ 0.95,  1.28, -0.40],
    [-0.62,  0.78,  0.42],
    [ 0.80,  0.16, -0.34],
    [-0.80, -0.44,  0.38],
    [ 0.62, -1.15, -0.28]
  ];
  const WIDTH = 0.30;     // half height of the band
  const STEPS = 11;       // subdivisions per span
  const LIGHT = norm([-0.35, 0.72, -0.85]);

  function norm(v) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }
  /* Catmull-Rom through the control points, so the folds curve like real ribbon */
  function spline(p, t) {
    const n = p.length - 1;
    const s = Math.min(Math.floor(t * n), n - 1);
    const u = t * n - s;
    const p0 = p[Math.max(s - 1, 0)], p1 = p[s], p2 = p[s + 1], p3 = p[Math.min(s + 2, n)];
    const u2 = u * u, u3 = u2 * u;
    return [0, 1, 2].map(i =>
      0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * u +
        (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * u2 +
        (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * u3));
  }

  function build() {
    const total = (RIBBON.length - 1) * STEPS;
    const rail = [];
    for (let i = 0; i <= total; i++) {
      const c = spline(RIBBON, i / total);
      rail.push([[c[0], c[1] + WIDTH, c[2]], [c[0], c[1] - WIDTH, c[2]]]);
    }
    const quads = [];
    for (let i = 0; i < rail.length - 1; i++) {
      quads.push({ v: [rail[i][0], rail[i + 1][0], rail[i + 1][1], rail[i][1]], t: i / (rail.length - 1) });
    }
    return quads;
  }

  function start(canvas) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const quads = build();
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const dust = Array.from({ length: 70 }, () => ({
      x: (Math.random() - .5) * 9,
      y: (Math.random() - .5) * 6,
      z: Math.random() * 11 + .6,
      r: Math.random() * 1.0 + .35
    }));

    let W = 0, H = 0, dpr = 1;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      W = Math.max(r.width, 1); H = Math.max(r.height, 1);
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    addEventListener('resize', size, { passive: true });

    /* pointer parallax, eased */
    let px = 0, py = 0, tx = 0, ty = 0;
    canvas.parentElement.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - .5) * 2;
      ty = ((e.clientY - r.top) / r.height - .5) * 2;
    }, { passive: true });
    canvas.parentElement.addEventListener('pointerleave', () => { tx = 0; ty = 0; }, { passive: true });

    const FOCAL = 3.1;
    function project(p, spin, tilt) {
      const ca = Math.cos(spin), sa = Math.sin(spin);
      let x = p[0] * ca + p[2] * sa;
      let z = -p[0] * sa + p[2] * ca;
      let y = p[1];
      const cb = Math.cos(tilt), sb = Math.sin(tilt);
      const y2 = y * cb - z * sb;
      z = y * sb + z * cb; y = y2;
      const d = FOCAL + z + 3.4;
      const k = (FOCAL * Math.min(W, H) * 0.42) / d;
      return { x: W / 2 + x * k, y: H / 2 - y * k, z: d, k };
    }

    function faceNormal(a, b, c) {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      return norm([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]);
    }

    function rotY(p, a) {
      const c = Math.cos(a), s = Math.sin(a);
      return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
    }

    let spin = -0.5, t0 = performance.now();

    function grid(tilt) {
      const y = -1.85, span = 5.4, near = -2.2, far = 9;
      ctx.lineWidth = 1;
      for (let i = -6; i <= 6; i++) {
        const x = (i / 6) * span;
        const a = project([x, y, near], 0, tilt), b = project([x, y, far], 0, tilt);
        const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        g.addColorStop(0, 'rgba(84,173,255,0.30)');
        g.addColorStop(1, 'rgba(84,173,255,0)');
        ctx.strokeStyle = g;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      for (let j = 0; j <= 11; j++) {
        const z = near + (far - near) * Math.pow(j / 11, 1.6);
        const a = project([-span, y, z], 0, tilt), b = project([span, y, z], 0, tilt);
        ctx.strokeStyle = `rgba(84,173,255,${0.26 * (1 - j / 11)})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    function frame(now) {
      const dt = Math.min((now - t0) / 1000, 0.05); t0 = now;
      px += (tx - px) * 0.055; py += (ty - py) * 0.055;
      if (!still) spin += dt * 0.28;

      const tilt = 0.16 + py * 0.16;
      const yaw = spin + px * 0.42;
      const bob = still ? 0 : Math.sin(now / 1400) * 0.06;

      ctx.clearRect(0, 0, W, H);

      /* floor */
      grid(tilt);

      /* dust behind and in front of the ribbon */
      for (const d of dust) {
        const p = project([d.x, d.y + bob * 0.4, d.z], yaw * 0.25, tilt);
        const a = Math.max(0, 0.42 - d.z / 30);
        ctx.fillStyle = `rgba(150,200,255,${a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.min(d.r * p.k * 0.05, 2.6), 0, 6.2832); ctx.fill();
      }

      /* ribbon: light, depth sort, paint back to front */
      const faces = [];
      for (const q of quads) {
        const world = q.v.map(v => rotY([v[0], v[1] + bob, v[2]], 0));
        const n = faceNormal(world[0], world[1], world[2]);
        const nr = rotY(n, yaw);
        const pts = world.map(v => project(v, yaw, tilt));
        const depth = pts.reduce((s, p) => s + p.z, 0) / 4;
        const lit = Math.max(0, nr[0] * LIGHT[0] + nr[1] * LIGHT[1] + nr[2] * LIGHT[2]);
        faces.push({ pts, depth, lit, t: q.t });
      }
      faces.sort((a, b) => b.depth - a.depth);

      for (const f of faces) {
        const sheen = Math.pow(f.lit, 2.2);
        /* deep azure in shadow, logo sky-blue lit, near-white at the specular peak */
        const r = Math.round(12 + 80 * f.lit + 150 * sheen);
        const g = Math.round(58 + 110 * f.lit + 90 * sheen);
        const b = Math.round(190 + 45 * f.lit + 20 * sheen);
        ctx.fillStyle = `rgb(${r},${g},${Math.min(b, 255)})`;
        ctx.beginPath();
        ctx.moveTo(f.pts[0].x, f.pts[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(f.pts[i].x, f.pts[i].y);
        ctx.closePath();
        ctx.fill();
        if (sheen > 0.45) {
          ctx.strokeStyle = `rgba(226,242,255,${(sheen - 0.45) * 0.9})`;
          ctx.lineWidth = 1; ctx.stroke();
        }
      }

      /* one soft pass of bloom over the brightest edge */
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = 'blur(14px)';
      ctx.globalAlpha = 0.28;
      for (const f of faces) {
        if (f.lit < 0.72) continue;
        ctx.fillStyle = 'rgb(70,150,255)';
        ctx.beginPath();
        ctx.moveTo(f.pts[0].x, f.pts[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(f.pts[i].x, f.pts[i].y);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();

      if (running) raf = requestAnimationFrame(frame);
    }

    let raf = null, running = false;
    function play() { if (running) return; running = true; t0 = performance.now(); raf = requestAnimationFrame(frame); }
    function pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

    if (still) { frame(performance.now()); return { pause, play }; }

    const io = new IntersectionObserver(e => e[0].isIntersecting ? play() : pause(), { threshold: 0 });
    io.observe(canvas);
    document.addEventListener('visibilitychange', () => document.hidden ? pause() : play());
    play();
    return { pause, play };
  }

  return { start };
})();
