/* universe-fx - vanilla re-creation of three effects seen on githubuniverse.com.
   Original code; no third-party dependencies.
   UniverseFX.cursorTrail({ root, colors, glyphs })
   UniverseFX.unscramble(selector)
   UniverseFX.mascot(canvas, { accent })
*/
(function (global) {
  "use strict";
  var reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 1. Snap-to-grid glyph trail: a ring of blocks, each lights up on a new
        20px cell, shows a random symbol, and fades after 100-400ms. */
  function cursorTrail(opts) {
    if (reduce) return function () {};
    opts = opts || {};
    var root = opts.root || document;
    var colors = opts.colors || ["#ae85ff", "#f73678", "#ff9d4d", "#7c6bff", "#5fed83", "#e6cf3a"];
    var glyphs = opts.glyphs || ["-", "/", ")", ".", "+", "=", ">", "<", "*", "&", "("];
    var grid = opts.grid || 20, count = opts.count || 10;
    var blocks = [], timers = new Set(), idx = 0, lastX = -1, lastY = -1;
    for (var i = 0; i < count; i++) {
      var b = document.createElement("div");
      b.className = "fx-trail-block";
      b.setAttribute("aria-hidden", "true");
      document.body.appendChild(b);
      blocks.push(b);
    }
    function onMove(e) {
      if (e.target.closest && e.target.closest("[data-fx-no-trail]")) return;
      var x = grid * Math.floor(e.clientX / grid), y = grid * Math.floor(e.clientY / grid);
      if (x === lastX && y === lastY) return;
      lastX = x; lastY = y;
      idx = (idx + 1) % count;
      var b = blocks[idx];
      b.style.transform = "translate(" + x + "px," + y + "px)";
      b.style.background = colors[Math.floor(Math.random() * colors.length)];
      b.textContent = Math.random() < 0.3 ? " " : glyphs[Math.floor(Math.random() * glyphs.length)];
      b.classList.add("fx-active");
      var t = setTimeout(function () { timers.delete(t); b.classList.remove("fx-active"); }, 100 + 300 * Math.random());
      timers.add(t);
    }
    root.addEventListener("mousemove", onMove);
    return function destroy() {
      root.removeEventListener("mousemove", onMove);
      timers.forEach(clearTimeout);
      blocks.forEach(function (b) { b.remove(); });
    };
  }

  /* 2. Text decode: on load and on mouseleave, each letter flashes 1-2 random
        characters (50ms apart per position) before settling on the real one. */
  var CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!@#$%^&*()_+-=[]{}|/;<>?";
  function unscramble(selector) {
    var els = document.querySelectorAll(selector || "[data-unscramble]");
    els.forEach(function (el) {
      var text = el.textContent, running = [];
      el.textContent = "";
      el.classList.add("fx-unscramble");
      var ph = document.createElement("span"); ph.className = "fx-ph"; ph.textContent = text;
      var live = document.createElement("span"); live.className = "fx-live"; live.setAttribute("aria-hidden", "true");
      el.setAttribute("aria-label", text);
      el.append(ph, live);
      if (reduce) { live.textContent = text; return; }
      function run() {
        running.forEach(clearTimeout); running = [];
        var buf = new Array(text.length).fill(" ");
        live.textContent = buf.join("");
        for (var i = 0; i < text.length; i++) (function (i) {
          var flashes = 1 + Math.floor(Math.random() * 2);
          for (var f = 0; f <= flashes; f++) (function (f) {
            running.push(setTimeout(function () {
              buf[i] = f < flashes ? CHARS.charAt(Math.floor(Math.random() * CHARS.length)) : text.charAt(i);
              live.textContent = buf.join("");
            }, 50 * i + 50 * f));
          })(f);
        })(i);
      }
      var host = el.closest("a") || el;
      host.addEventListener("mouseleave", run);
      host.addEventListener("focus", run);
      run();
    });
  }

  /* 3. Cursor-tracking cat mascot on a reactive dot grid (original artwork). */
  function mascot(canvas, opts) {
    opts = opts || {};
    var accent = opts.accent || "#ae85ff";
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(global.devicePixelRatio || 1, 2), W = 0, H = 0;
    var target = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, t0 = performance.now(), visible = true, raf;

    function size() {
      var r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function move(e) {
      var r = canvas.getBoundingClientRect();
      target.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      target.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
    }
    function ear(cx, cy, s, flip) {
      ctx.beginPath();
      ctx.moveTo(cx - flip * s * 1.1, cy);
      ctx.lineTo(cx - flip * s * 0.9, cy - s * 1.5);
      ctx.lineTo(cx + flip * s * 0.1, cy - s * 0.2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    function draw(now) {
      raf = requestAnimationFrame(draw);
      if (!visible) return;
      var t = (now - t0) / 1000;
      cur.x += (target.x - cur.x) * 0.08; cur.y += (target.y - cur.y) * 0.08;
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2, u = Math.min(W, H) / 10;

      // dot grid: a sine ripple radiates from the head
      var step = 20;
      for (var gx = step / 2; gx < W; gx += step) for (var gy = step / 2; gy < H; gy += step) {
        var dx = gx - (cx + cur.x * u * 2), dy = gy - (cy + cur.y * u * 2);
        var d = Math.sqrt(dx * dx + dy * dy);
        var wave = 0.5 + 0.5 * Math.sin(d / 18 - t * 2.2);
        var r = 1 + (wave * 1.4) * Math.max(0, 1 - d / (u * 7));
        ctx.globalAlpha = 0.25 + 0.5 * Math.max(0, 1 - d / (u * 8));
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.arc(gx, gy, r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.translate(cx + cur.x * u * 0.9, cy + cur.y * u * 0.5 + Math.sin(t * 1.6) * u * 0.12);
      ctx.rotate(cur.x * 0.12);
      ctx.fillStyle = "#1b1726"; ctx.strokeStyle = accent; ctx.lineWidth = 3;
      ear(-u * 1.6, -u * 1.7, u * 0.9, -1); ear(u * 1.6, -u * 1.7, u * 0.9, 1);
      ctx.beginPath(); ctx.ellipse(0, 0, u * 2.6, u * 2.2, 0, 0, 6.283); ctx.fill(); ctx.stroke();
      var blink = (t % 4) > 3.85 ? 0.1 : 1;
      [-1, 1].forEach(function (s) {
        var ex = s * u * 1, ey = -u * 0.2;
        ctx.fillStyle = "#f4f0ff";
        ctx.beginPath(); ctx.ellipse(ex, ey, u * 0.6, u * 0.7 * blink, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = "#14111c";
        ctx.beginPath(); ctx.arc(ex + cur.x * u * 0.28, ey + cur.y * u * 0.3, u * 0.28 * blink + 0.5, 0, 6.283); ctx.fill();
      });
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.moveTo(-u * 0.25, u * 0.55); ctx.lineTo(u * 0.25, u * 0.55); ctx.lineTo(0, u * 0.85); ctx.fill();
      ctx.lineWidth = 1.5;
      [-1, 1].forEach(function (s) { for (var k = -1; k <= 1; k++) {
        ctx.beginPath(); ctx.moveTo(s * u * 1.2, u * 0.8 + k * u * 0.2);
        ctx.lineTo(s * u * 2.6, u * 0.8 + k * u * 0.45 + Math.sin(t * 2 + k) * 2); ctx.stroke(); } });
      ctx.restore();
    }
    size();
    global.addEventListener("resize", size);
    global.addEventListener("mousemove", move);
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(canvas);
    if (reduce) { draw(t0); cancelAnimationFrame(raf); return; }
    raf = requestAnimationFrame(draw);
  }

  global.UniverseFX = { cursorTrail: cursorTrail, unscramble: unscramble, mascot: mascot };
})(window);
