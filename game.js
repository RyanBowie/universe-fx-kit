/* universe-fx game: "Shark Dodge" - a tiny underwater octopus dodger (original art & code).
   UniverseFX.game({ canvas, onExit }) -> { start(), stop() }
   Controls: arrows / WASD to swim, or drag with finger / mouse on the canvas. Esc pauses.
   Dodge the sharks, grab pearls (+5), survive as long as you can. */
(function (global) {
  "use strict";
  var W = 960, H = 420, S = 3;

  var PAL = { p: "#8a5fe0", l: "#c4a8ff", w: "#ffffff", k: "#1a1030", s: "#ff8fb1" };
  var TOP = [
    "....pppp....",
    "..pppppppp..",
    ".ppllpppppp.",
    ".ppwkppwkpp.",
    ".ppwkppwkpp.",
    ".pppppppppp.",
    ".psppppppsp."
  ];
  var LEGS = [
    [".pp.pppp.pp.", ".p.pp..pp.p.", "pp.p....p.pp", ".p.p....p.p.", "..p......p.."],
    [".ppp.pp.ppp.", "pp.pp..pp.pp", "p.p.p..p.p.p", ".p..p..p..p.", "p..........p"]
  ];

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function newState() {
    var bubbles = [];
    for (var i = 0; i < 28; i++) bubbles.push({ x: rnd(0, W), y: rnd(0, H), r: rnd(1.5, 4), v: rnd(10, 30) });
    return {
      p: { x: 120, y: H / 2, w: 30, h: 30, inv: 0 },
      sharks: [], warns: [], pearls: [], bubbles: bubbles,
      hearts: 3, score: 0, time: 0, nextShark: 1.2, nextPearl: 1.5, mode: "play"
    };
  }

  function game(opts) {
    var canvas = opts.canvas, ctx = canvas.getContext("2d");
    canvas.width = W; canvas.height = H;
    var st = newState(), keys = {}, target = null, best = 0;
    var raf = 0, last = 0, running = false, visible = true, t = 0, observer = null;

    function restart() { st = newState(); }

    function onKey(e, down) {
      var k = e.key, used = true;
      if (k === "ArrowLeft" || k === "a" || k === "A") keys.l = down;
      else if (k === "ArrowRight" || k === "d" || k === "D") keys.r = down;
      else if (k === "ArrowUp" || k === "w" || k === "W") keys.u = down;
      else if (k === "ArrowDown" || k === "s" || k === "S") keys.d = down;
      else if (k === " ") { if (down && st.mode === "over") restart(); }
      else if (k === "Escape" && down) { stop(); if (opts.onExit) opts.onExit(); }
      else used = false;
      if (used && visible) e.preventDefault();
    }
    function kd(e) { onKey(e, true); }
    function ku(e) { onKey(e, false); }

    function setTarget(e) {
      var r = canvas.getBoundingClientRect();
      target = { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
    }
    function pd(e) {
      if (st.mode === "over") { restart(); return; }
      setTarget(e);
      try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
    }
    function pm(e) { if (target) setTarget(e); }
    function pu() { target = null; }

    function spawnWarn() {
      var d = Math.min(st.time / 60, 1);
      var fromLeft = st.time > 20 && Math.random() < 0.3;
      st.warns.push({
        y: rnd(40, H - 40), t: 0.9, left: fromLeft,
        speed: rnd(200, 280) + d * 200, size: rnd(0.8, 1.2)
      });
    }

    function update(dt) {
      var p = st.p, i;
      st.time += dt;
      t += dt;
      st.bubbles.forEach(function (b) { b.y -= b.v * dt; if (b.y < -5) { b.y = H + 5; b.x = rnd(0, W); } });
      if (st.mode !== "play") return;

      var sp = 290, dx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), dy = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
      if (dx || dy) {
        var m = Math.sqrt(dx * dx + dy * dy);
        p.x += dx / m * sp * dt; p.y += dy / m * sp * dt;
      } else if (target) {
        var tx = target.x - p.x, ty = target.y - p.y, dist = Math.sqrt(tx * tx + ty * ty);
        if (dist > 4) { var step = Math.min(dist, sp * 1.3 * dt); p.x += tx / dist * step; p.y += ty / dist * step; }
      }
      p.x = Math.max(p.w / 2, Math.min(W - p.w / 2, p.x));
      p.y = Math.max(p.h / 2, Math.min(H - p.h / 2, p.y));
      if (p.inv > 0) p.inv -= dt;
      st.score += dt * 10;

      var d = Math.min(st.time / 60, 1);
      st.nextShark -= dt;
      if (st.nextShark <= 0) { spawnWarn(); st.nextShark = rnd(0.7, 1.5) - d * 0.5; }
      st.nextPearl -= dt;
      if (st.nextPearl <= 0) {
        st.pearls.push({ x: W + 10, y: rnd(30, H - 30), v: rnd(60, 100) });
        st.nextPearl = rnd(1.2, 2.4);
      }

      for (i = st.warns.length - 1; i >= 0; i--) {
        var w = st.warns[i];
        w.t -= dt;
        if (w.t <= 0) {
          st.sharks.push({ x: w.left ? -90 : W + 90, y: w.y, v: (w.left ? 1 : -1) * w.speed, s: w.size, ph: rnd(0, 6) });
          st.warns.splice(i, 1);
        }
      }
      for (i = st.sharks.length - 1; i >= 0; i--) {
        var s = st.sharks[i];
        s.x += s.v * dt;
        if (s.x < -120 || s.x > W + 120) { st.sharks.splice(i, 1); st.score += 5; continue; }
        if (p.inv <= 0 && hitShark(s, p)) {
          st.hearts--; p.inv = 1.6;
          if (st.hearts <= 0) { st.mode = "over"; best = Math.max(best, Math.floor(st.score)); }
        }
      }
      for (i = st.pearls.length - 1; i >= 0; i--) {
        var pe = st.pearls[i];
        pe.x -= pe.v * dt;
        if (pe.x < -10) { st.pearls.splice(i, 1); continue; }
        if (Math.abs(pe.x - p.x) < 20 && Math.abs(pe.y - p.y) < 20) { st.score += 5; st.pearls.splice(i, 1); }
      }
    }

    // Forgiving hitbox: body ellipse only, smaller than the artwork.
    function hitShark(s, p) {
      var ex = (s.x - p.x) / (60 * s.s), ey = (s.y - p.y) / (18 * s.s + 12);
      return ex * ex + ey * ey < 1;
    }

    function px(rows, ox, oy) {
      for (var r = 0; r < rows.length; r++) for (var c = 0; c < rows[r].length; c++) {
        var ch = rows[r][c];
        if (ch !== ".") { ctx.fillStyle = PAL[ch]; ctx.fillRect(ox + c * S, oy + r * S, S, S); }
      }
    }
    function drawOcto(p) {
      if (p.inv > 0 && Math.floor(p.inv * 12) % 2) return;
      var ox = Math.round(p.x - 18), oy = Math.round(p.y - 18);
      px(TOP, ox, oy);
      px(LEGS[Math.floor(t * 6) % 2], ox, oy + TOP.length * S);
    }

    function drawShark(s) {
      var dir = s.v < 0 ? 1 : -1; // art faces left; flip for right-moving
      var wag = Math.sin(t * 8 + s.ph) * 6 * s.s;
      ctx.save();
      ctx.translate(s.x, s.y); ctx.scale(dir * s.s, s.s);
      ctx.fillStyle = "#4a5b78";
      ctx.beginPath(); ctx.moveTo(48, 0); ctx.lineTo(82, -24 + wag); ctx.lineTo(72, 0); ctx.lineTo(82, 24 + wag); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6, -17); ctx.lineTo(18, -42); ctx.lineTo(24, -16); ctx.closePath(); ctx.fill();
      var g = ctx.createLinearGradient(0, -20, 0, 20);
      g.addColorStop(0, "#5f7396"); g.addColorStop(0.55, "#7d93b5"); g.addColorStop(1, "#dfe8f5");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-62, 4); ctx.quadraticCurveTo(-30, -26, 20, -18); ctx.quadraticCurveTo(52, -10, 56, 0);
      ctx.quadraticCurveTo(40, 20, -10, 22); ctx.quadraticCurveTo(-45, 22, -62, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#4a5b78";
      ctx.beginPath(); ctx.moveTo(-4, 20); ctx.lineTo(14, 36); ctx.lineTo(24, 18); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(40,55,80,.5)"; ctx.lineWidth = 2;
      for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-22 + i * 5, -6); ctx.quadraticCurveTo(-26 + i * 5, 2, -22 + i * 5, 10); ctx.stroke(); }
      ctx.strokeStyle = "#1a1030"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-60, 6); ctx.quadraticCurveTo(-42, 14, -26, 10); ctx.stroke();
      ctx.fillStyle = "#fff";
      for (var j = 0; j < 4; j++) { ctx.beginPath(); ctx.moveTo(-56 + j * 9, 7 + j); ctx.lineTo(-52 + j * 9, 14 + j); ctx.lineTo(-48 + j * 9, 8 + j); ctx.fill(); }
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-42, -4, 5, 0, 6.3); ctx.fill();
      ctx.fillStyle = "#ff3b5c"; ctx.beginPath(); ctx.arc(-43, -4, 2.6, 0, 6.3); ctx.fill();
      ctx.restore();
    }

    function drawHeart(x, y, on) {
      var rows = ["..xx..xx..", ".xxxxxxxx.", ".xxxxxxxx.", "..xxxxxx..", "...xxxx...", "....xx...."];
      ctx.fillStyle = on ? "#ff6fa0" : "#3a3057";
      for (var r = 0; r < rows.length; r++) for (var c = 0; c < rows[r].length; c++)
        if (rows[r][c] === "x") ctx.fillRect(x + c * 3, y + r * 3, 3, 3);
    }

    function draw() {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#1d2a52"); g.addColorStop(1, "#0e1330");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(160,200,255,.05)";
      for (var i = 0; i < 4; i++) {
        var x = 120 + i * 240 + Math.sin(t * 0.4 + i) * 20;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 70, 0); ctx.lineTo(x + 10, H); ctx.lineTo(x - 90, H); ctx.fill();
      }
      ctx.fillStyle = "rgba(200,225,255,.35)";
      st.bubbles.forEach(function (b) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.3); ctx.fill(); });
      ctx.fillStyle = "#16193a"; ctx.fillRect(0, H - 14, W, 14);

      st.pearls.forEach(function (pe) {
        ctx.fillStyle = "#f3ecff"; ctx.beginPath(); ctx.arc(pe.x, pe.y, 7, 0, 6.3); ctx.fill();
        ctx.fillStyle = "rgba(174,133,255,.5)"; ctx.beginPath(); ctx.arc(pe.x - 2, pe.y - 2, 3, 0, 6.3); ctx.fill();
      });
      st.warns.forEach(function (w) {
        if (Math.floor(w.t * 10) % 2) return;
        var x = w.left ? 26 : W - 26;
        ctx.fillStyle = "#ff3b5c"; ctx.beginPath();
        ctx.moveTo(x, w.y - 16); ctx.lineTo(x + 16, w.y + 12); ctx.lineTo(x - 16, w.y + 12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 16px monospace"; ctx.textAlign = "center"; ctx.fillText("!", x, w.y + 10);
      });
      st.sharks.forEach(drawShark);
      drawOcto(st.p);

      for (var h = 0; h < 3; h++) drawHeart(16 + h * 36, 14, h < st.hearts);
      ctx.fillStyle = "#fff"; ctx.font = "bold 18px monospace"; ctx.textAlign = "right";
      ctx.fillText("Your score: " + Math.floor(st.score), W - 16, 30);
      if (best) { ctx.fillStyle = "#b9a8e8"; ctx.font = "14px monospace"; ctx.fillText("Best: " + best, W - 16, 52); }

      if (st.mode === "over") {
        ctx.fillStyle = "rgba(10,8,24,.72)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff"; ctx.textAlign = "center";
        ctx.font = "bold 36px monospace"; ctx.fillText("Chomped!", W / 2, H / 2 - 20);
        ctx.font = "18px monospace"; ctx.fillText("Score " + Math.floor(st.score) + "  -  best " + best, W / 2, H / 2 + 14);
        ctx.fillStyle = "#5fed83"; ctx.fillText("Press Space or tap to swim again", W / 2, H / 2 + 48);
      }
    }

    function loop(now) {
      if (!running) return;
      var dt = Math.max(0, Math.min((now - last) / 1000, 0.05)); last = now;
      if (visible) { update(dt); draw(); }
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (running) return;
      running = true; last = performance.now();
      window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
      canvas.addEventListener("pointerdown", pd); canvas.addEventListener("pointermove", pm);
      canvas.addEventListener("pointerup", pu); canvas.addEventListener("pointercancel", pu);
      if (window.IntersectionObserver) {
        observer = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; last = performance.now(); }, { threshold: 0.3 });
        observer.observe(canvas);
      }
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      running = false; cancelAnimationFrame(raf); keys = {}; target = null;
      window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku);
      canvas.removeEventListener("pointerdown", pd); canvas.removeEventListener("pointermove", pm);
      canvas.removeEventListener("pointerup", pu); canvas.removeEventListener("pointercancel", pu);
      if (observer) { observer.disconnect(); observer = null; }
    }

    draw();
    return { start: start, stop: stop };
  }

  global.UniverseFX = global.UniverseFX || {};
  global.UniverseFX.game = game;
})(window);
