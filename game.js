/* universe-fx game: a tiny side-scrolling octopus platformer (original art & code).
   UniverseFX.game({ canvas, onExit }) -> { start(), stop() }
   Controls: arrows / A D to move, Space / Up / W to jump, Esc to exit.
   Stomp bugs for +25, collect pearls for +5, reach the gem to win. */
(function (global) {
  "use strict";
  var W = 960, H = 420, T = 20, WORLD = 3700, FLOOR = H, S = 3;

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

  var PLATS = [[200,340,5],[400,300,6],[620,340,4],[820,300,6],[1060,340,5],[1260,280,8],[1520,320,4],
    [1720,260,6],[1960,300,6],[2200,240,5],[2420,280,8],[2700,320,5],[2900,260,6],[3140,200,8],[3400,260,5]];
  var GROUND_BUGS = [560, 1000, 1480, 1900, 2350, 2800, 3300];
  var PLATFORM_BUGS = [3, 5, 7, 10, 13];

  function newState() {
    var plats = PLATS.map(function (p) { return { x: p[0], y: p[1], n: p[2] }; });
    var bugs = GROUND_BUGS.map(function (x) {
      return { x: x, y: FLOOR - 14, min: x - 100, max: x + 100, dir: 1, alive: true, squash: 0 };
    });
    PLATFORM_BUGS.forEach(function (i) {
      var p = plats[i];
      bugs.push({ x: p.x + 20, y: p.y - 14, min: p.x, max: p.x + p.n * T - 24, dir: 1, alive: true, squash: 0 });
    });
    var pearls = [];
    plats.forEach(function (p) {
      for (var i = 1; i < p.n; i += 2) pearls.push({ x: p.x + i * T + 10, y: p.y - 34, got: false });
    });
    return {
      p: { x: 40, y: FLOOR - 32, w: 28, h: 32, vx: 0, vy: 0, face: 1, onGround: true, inv: 0 },
      plats: plats, bugs: bugs, pearls: pearls, gem: { x: 3600, y: FLOOR - 36 },
      hearts: 3, score: 0, mode: "play", cam: 0
    };
  }

  function game(opts) {
    var canvas = opts.canvas, ctx = canvas.getContext("2d");
    canvas.width = W; canvas.height = H;
    var st = newState(), keys = { left: false, right: false }, jumpQueued = false;
    var raf = 0, last = 0, running = false, t = 0;

    function key(e, down) {
      var k = e.key, used = true;
      if (k === "ArrowLeft" || k === "a" || k === "A") keys.left = down;
      else if (k === "ArrowRight" || k === "d" || k === "D") keys.right = down;
      else if (k === " " || k === "ArrowUp" || k === "w" || k === "W") { if (down) jumpQueued = true; }
      else if (k === "Escape" && down) { stop(); if (opts.onExit) opts.onExit(); }
      else used = false;
      if (used) e.preventDefault();
    }
    function kd(e) { key(e, true); }
    function ku(e) { key(e, false); }

    // on-screen buttons for touch devices
    function bindTouch(el) {
      if (!el) return;
      var map = { left: "left", right: "right" };
      el.querySelectorAll("[data-ctl]").forEach(function (b) {
        var c = b.dataset.ctl;
        function on(e) { e.preventDefault(); if (c === "jump") jumpQueued = true; else keys[map[c]] = true; }
        function off(e) { e.preventDefault(); if (c !== "jump") keys[map[c]] = false; }
        b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off);
        b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
      });
    }
    bindTouch(opts.touch);

    function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

    function update(dt) {
      var p = st.p;
      if (st.mode !== "play") {
        if (jumpQueued) { st = newState(); }
        jumpQueued = false; return;
      }
      var dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      p.vx += (dir * 260 - p.vx) * Math.min(1, 12 * dt);
      if (dir) p.face = dir;
      if (jumpQueued && p.onGround) { p.vy = -640; p.onGround = false; }
      jumpQueued = false;
      p.vy = Math.min(900, p.vy + 1800 * dt);
      var prevBottom = p.y + p.h;
      p.x = Math.max(0, Math.min(WORLD - p.w, p.x + p.vx * dt));
      p.y += p.vy * dt;
      p.onGround = false;
      if (p.y + p.h >= FLOOR) { p.y = FLOOR - p.h; p.vy = 0; p.onGround = true; }
      st.plats.forEach(function (pl) {
        if (p.vy >= 0 && prevBottom <= pl.y + 2 && p.y + p.h >= pl.y && p.x + p.w > pl.x && p.x < pl.x + pl.n * T) {
          p.y = pl.y - p.h; p.vy = 0; p.onGround = true;
        }
      });
      p.inv = Math.max(0, p.inv - dt);

      st.bugs.forEach(function (b) {
        if (!b.alive) { b.squash = Math.max(0, b.squash - dt); return; }
        b.x += b.dir * 50 * dt;
        if (b.x < b.min) { b.x = b.min; b.dir = 1; } else if (b.x > b.max) { b.x = b.max; b.dir = -1; }
        var box = { x: b.x, y: b.y, w: 24, h: 14 };
        if (!overlap(p, box)) return;
        if (p.vy > 0 && prevBottom <= b.y + 8) {
          b.alive = false; b.squash = 0.4; p.vy = -420; st.score += 25;
        } else if (p.inv <= 0) {
          st.hearts--; p.inv = 1.6; p.vy = -350;
          p.vx = (p.x + p.w / 2 < b.x + 12 ? -1 : 1) * 320;
          if (st.hearts <= 0) st.mode = "over";
        }
      });
      st.pearls.forEach(function (pe) {
        if (!pe.got && Math.abs(p.x + p.w / 2 - pe.x) < 20 && Math.abs(p.y + p.h / 2 - pe.y) < 24) { pe.got = true; st.score += 5; }
      });
      if (overlap(p, { x: st.gem.x, y: st.gem.y, w: 24, h: 24 })) { st.score += 100; st.mode = "won"; }
      st.cam = Math.max(0, Math.min(WORLD - W, p.x - W * 0.4));
    }

    function sprite(rows, x, y, flip) {
      for (var r = 0; r < rows.length; r++) for (var c = 0; c < 12; c++) {
        var ch = rows[r].charAt(flip ? 11 - c : c);
        if (ch !== ".") { ctx.fillStyle = PAL[ch]; ctx.fillRect(x + c * S, y + r * S, S, S); }
      }
    }
    function heart(x, y, on) {
      ctx.fillStyle = on ? "#ff6b9a" : "#3a3057";
      [[1,0],[2,0],[4,0],[5,0],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],
       [1,3],[2,3],[3,3],[4,3],[5,3],[2,4],[3,4],[4,4],[3,5]].forEach(function (q) { ctx.fillRect(x + q[0] * 3, y + q[1] * 3, 3, 3); });
    }
    function bug(b) {
      var x = b.x, y = b.y;
      if (!b.alive) { if (b.squash <= 0) return; y += 9; ctx.fillStyle = "#ff9d4d"; ctx.fillRect(x, y + 2, 24, 3); return; }
      var leg = Math.floor(t * 8 + x) % 2;
      ctx.fillStyle = "#1a1030";
      for (var i = 0; i < 4; i++) ctx.fillRect(x + 3 + i * 6, y + 11 + (i + leg) % 2, 2, 3);
      ctx.fillStyle = "#ff9d4d"; ctx.fillRect(x + 2, y + 2, 20, 10); ctx.fillRect(x + 4, y, 16, 2);
      ctx.fillStyle = "#5fed83"; for (var s = 0; s < 3; s++) ctx.fillRect(x + 6 + s * 6, y + 1, 3, 11);
      ctx.fillStyle = "#1a1030"; var hx = b.dir > 0 ? x + 18 : x; ctx.fillRect(hx, y + 3, 6, 6);
      ctx.fillStyle = "#fff"; ctx.fillRect(hx + (b.dir > 0 ? 3 : 1), y + 4, 2, 2);
    }

    function render() {
      ctx.clearRect(0, 0, W, H);
      ctx.save(); ctx.translate(-Math.round(st.cam), 0);
      st.plats.forEach(function (pl) {
        for (var i = 0; i < pl.n; i++) {
          ctx.fillStyle = "#5b4a8f"; ctx.fillRect(pl.x + i * T, pl.y, T, T);
          ctx.fillStyle = "#7a66b8"; ctx.fillRect(pl.x + i * T, pl.y, T, 3);
          ctx.fillStyle = "#3a3057"; ctx.fillRect(pl.x + i * T + T - 2, pl.y, 2, T);
        }
      });
      st.pearls.forEach(function (pe) {
        if (pe.got) return;
        var yy = pe.y + Math.sin(t * 3 + pe.x) * 3;
        ctx.fillStyle = "#e6d9ff"; ctx.beginPath(); ctx.arc(pe.x, yy, 6, 0, 6.283); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.fillRect(pe.x - 3, yy - 3, 2, 2);
      });
      // gem: a small colourful pixel block
      var cols = ["#f73678", "#ae85ff", "#ff9d4d", "#5fed83", "#e6cf3a", "#583af7"];
      for (var gy = 0; gy < 3; gy++) for (var gx = 0; gx < 3; gx++) {
        ctx.fillStyle = cols[(gx * 2 + gy + Math.floor(t * 2)) % cols.length]; ctx.fillRect(st.gem.x + gx * 8, st.gem.y + gy * 8 - 4 + Math.sin(t * 3) * 3, 8, 8);
      }
      st.bugs.forEach(bug);
      var p = st.p;
      if (!(p.inv > 0 && Math.floor(t * 14) % 2)) {
        var moving = Math.abs(p.vx) > 40 && p.onGround, f = moving ? Math.floor(t * 10) % 2 : (p.onGround ? 0 : 1);
        var rows = TOP.concat(LEGS[f]);
        sprite(rows, Math.round(p.x) - 4, Math.round(p.y) - 4, p.face < 0);
      }
      ctx.restore();

      for (var h = 0; h < 3; h++) heart(24 + h * 30, 22, h < st.hearts);
      ctx.fillStyle = "#ece8f5"; ctx.font = "700 18px ui-monospace, Consolas, monospace"; ctx.textAlign = "right";
      ctx.fillText("Your score: " + st.score, W - 24, 38);
      if (st.mode !== "play") {
        ctx.fillStyle = "rgba(20,17,28,0.72)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ece8f5"; ctx.textAlign = "center";
        ctx.font = "700 34px ui-monospace, Consolas, monospace";
        ctx.fillText(st.mode === "won" ? "You made it! " + st.score + " pts" : "Game over - " + st.score + " pts", W / 2, H / 2 - 8);
        ctx.font = "16px ui-monospace, Consolas, monospace"; ctx.fillStyle = "#ae85ff";
        ctx.fillText("press Space or tap jump to play again", W / 2, H / 2 + 28);
      }
    }

    function loop(now) {
      if (!running) return;
      var dt = Math.min(0.033, (now - last) / 1000); last = now; t += dt;
      update(dt); render();
      raf = requestAnimationFrame(loop);
    }
    function start() {
      if (running) return;
      st = newState(); keys.left = keys.right = false; jumpQueued = false;
      running = true; last = performance.now();
      window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      running = false; cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku);
    }
    return { start: start, stop: stop };
  }

  global.UniverseFX = global.UniverseFX || {};
  global.UniverseFX.game = game;
})(window);
