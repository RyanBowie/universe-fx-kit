/* universe-fx - vanilla re-creation of three effects seen on githubuniverse.com.
   Original code; no third-party dependencies.
   UniverseFX.cursorTrail({ root, colors, glyphs })
   UniverseFX.unscramble(selector)
   UniverseFX.mascot(canvas, { accent })
*/
(function (global) {
  "use strict";
  var reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Suppress the trail over anything you might select or click, so copy/paste stays easy.
  var SKIP = "nav,header,a,button,input,textarea,select,label,pre,code,[data-fx-no-trail]";
  function overText(el) {
    if (!el || !el.closest) return false;
    if (el.closest(SKIP)) return true;
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && n.nodeValue.trim()) return true;
    }
    return false;
  }

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
      if (overText(e.target)) return;
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
    var FUR = "#2b2342", FUR_LIGHT = "#3d3260", FUR_DARK = "#1b1630", happyUntil = 0;

    function blob(x, y, rx, ry, fill, stroke, lw) {
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 6.283);
      ctx.fillStyle = fill; ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
    }
    function furGrad(x, y, r) {
      var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r * 1.2);
      g.addColorStop(0, FUR_LIGHT); g.addColorStop(1, FUR); return g;
    }
    function ear(s, u, twitch) {
      ctx.save();
      ctx.translate(s * u * 1.75, -u * 1.45);
      ctx.rotate(s * (0.28 + twitch));
      ctx.beginPath();
      ctx.moveTo(-u * 0.95, u * 0.5); ctx.quadraticCurveTo(-u * 0.8, -u * 1.9, u * 0.1, -u * 1.75);
      ctx.quadraticCurveTo(u * 1.0, -u * 1.2, u * 0.95, u * 0.5); ctx.closePath();
      ctx.fillStyle = FUR; ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-u * 0.5, u * 0.3); ctx.quadraticCurveTo(-u * 0.45, -u * 1.1, u * 0.05, -u * 1.0);
      ctx.quadraticCurveTo(u * 0.55, -u * 0.7, u * 0.5, u * 0.3); ctx.closePath();
      ctx.fillStyle = "#ff8fb1"; ctx.globalAlpha = 0.75; ctx.fill(); ctx.globalAlpha = 1;
      ctx.restore();
    }
    function eye(s, u, blink, happy) {
      var ex = s * u * 1.05, ey = -u * 0.1;
      if (happy) {
        ctx.strokeStyle = "#f4f0ff"; ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(ex, ey + u * 0.25, u * 0.45, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        return;
      }
      ctx.save();
      ctx.beginPath(); ctx.ellipse(ex, ey, u * 0.62, u * 0.78 * blink, 0, 0, 6.283); ctx.clip();
      ctx.fillStyle = "#fbf9ff"; ctx.fillRect(ex - u, ey - u, u * 2, u * 2);
      var px = ex + cur.x * u * 0.3, py = ey + cur.y * u * 0.35;
      var g = ctx.createRadialGradient(px, py, u * 0.05, px, py, u * 0.5);
      g.addColorStop(0, "#5fed83"); g.addColorStop(1, "#1f8f4e");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, u * 0.46, 0, 6.283); ctx.fill();
      ctx.fillStyle = "#0e0b17"; ctx.beginPath(); ctx.ellipse(px, py, u * 0.14, u * 0.34, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(px - u * 0.15, py - u * 0.17, u * 0.1, 0, 6.283); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = FUR_DARK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(ex, ey, u * 0.62, u * 0.78 * blink, 0, 0, 6.283); ctx.stroke();
    }
    function drawCat(t, cx, cy, u) {
      var sway = Math.sin(t * 1.4);
      ctx.save(); ctx.translate(cx, cy);
      ctx.lineCap = "round"; ctx.lineJoin = "round";

      // ground shadow
      ctx.globalAlpha = 0.35; blob(0, u * 4.9, u * 3, u * 0.45, "#000"); ctx.globalAlpha = 1;

      // tail swaying behind the body
      ctx.strokeStyle = FUR; ctx.lineWidth = u * 0.75;
      ctx.beginPath(); ctx.moveTo(u * 1.6, u * 4.2);
      ctx.bezierCurveTo(u * 4.2, u * 4.6, u * (4.6 + sway * 0.5), u * 1.6, u * (3.2 + sway * 0.9), u * 0.4);
      ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = u * 0.75;
      ctx.beginPath(); ctx.moveTo(u * (3.9 + sway * 0.55), u * 1.05);
      ctx.lineTo(u * (3.2 + sway * 0.9), u * 0.4); ctx.stroke();

      // body, belly patch, front paws
      blob(0, u * 2.9, u * 2.2, u * 2.2, furGrad(0, u * 2.9, u * 2.2), accent, 2);
      blob(0, u * 3.2, u * 1.1, u * 1.5, "#4a3d73");
      blob(-u * 0.85, u * 4.75, u * 0.75, u * 0.45, FUR_LIGHT, accent, 1.5);
      blob(u * 0.85, u * 4.75, u * 0.75, u * 0.45, FUR_LIGHT, accent, 1.5);

      // collar with a tag
      ctx.strokeStyle = accent; ctx.lineWidth = u * 0.28;
      ctx.beginPath(); ctx.arc(0, u * 0.9, u * 1.55, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      blob(0, u * 2.55, u * 0.3, u * 0.3, "#ffd45e");

      // head leans toward the pointer
      ctx.translate(cur.x * u * 0.6, -u * 1.15 + cur.y * u * 0.3 + Math.sin(t * 1.6) * u * 0.08);
      ctx.rotate(cur.x * 0.1);
      var twitch = (t % 5.3) > 5.15 ? 0.18 : 0;
      ear(-1, u, -twitch); ear(1, u, twitch);
      blob(0, 0, u * 2.75, u * 2.2, furGrad(0, 0, u * 2.75), accent, 2.5);

      // forehead stripes
      ctx.strokeStyle = FUR_DARK; ctx.lineWidth = 2.5;
      [-0.5, 0, 0.5].forEach(function (k) {
        ctx.beginPath(); ctx.moveTo(k * u * 0.8, -u * 2.15); ctx.lineTo(k * u * 0.75, -u * 1.45); ctx.stroke();
      });

      var happy = performance.now() < happyUntil;
      var blink = (t % 4) > 3.85 ? 0.1 : 1;
      eye(-1, u, blink, happy); eye(1, u, blink, happy);

      // cheeks, nose, mouth
      ctx.globalAlpha = 0.45;
      blob(-u * 1.85, u * 0.75, u * 0.45, u * 0.28, "#ff8fb1"); blob(u * 1.85, u * 0.75, u * 0.45, u * 0.28, "#ff8fb1");
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ff8fb1";
      ctx.beginPath(); ctx.moveTo(-u * 0.3, u * 0.6); ctx.lineTo(u * 0.3, u * 0.6); ctx.lineTo(0, u * 0.95); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#f4f0ff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, u * 0.95); ctx.lineTo(0, u * 1.15);
      ctx.moveTo(0, u * 1.15); ctx.quadraticCurveTo(-u * 0.3, u * 1.5, -u * 0.65, u * 1.2);
      ctx.moveTo(0, u * 1.15); ctx.quadraticCurveTo(u * 0.3, u * 1.5, u * 0.65, u * 1.2); ctx.stroke();

      // whiskers
      ctx.strokeStyle = "rgba(244,240,255,0.8)"; ctx.lineWidth = 1.4;
      [-1, 1].forEach(function (s) { for (var k = -1; k <= 1; k++) {
        ctx.beginPath(); ctx.moveTo(s * u * 1.3, u * 0.95 + k * u * 0.18);
        ctx.quadraticCurveTo(s * u * 2.3, u * 0.8 + k * u * 0.4 + Math.sin(t * 2 + k) * 1.5, s * u * 3.1, u * 0.95 + k * u * 0.6); ctx.stroke(); } });
      ctx.restore();
    }
    function rr(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    }
    function happyEye(ex, ey, u, col) {
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(ex, ey + u * 0.25, u * 0.45, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }

    function drawRobot(t, cx, cy, u) {
      var happy = performance.now() < happyUntil, bob = Math.sin(t * 1.8) * u * 0.08;
      ctx.save(); ctx.translate(cx, cy); ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.globalAlpha = 0.35; blob(0, u * 4.9, u * 2.6, u * 0.4, "#000"); ctx.globalAlpha = 1;
      // legs
      [-1, 1].forEach(function (s) {
        rr(s * u * 0.95 - u * 0.4, u * 3.9, u * 0.8, u * 0.8, u * 0.25); ctx.fillStyle = "#5b4a8f"; ctx.fill();
        rr(s * u * 0.95 - u * 0.75, u * 4.55, u * 1.5, u * 0.4, u * 0.2); ctx.fillStyle = FUR_LIGHT; ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.stroke();
      });
      // arms
      [-1, 1].forEach(function (s) {
        ctx.save(); ctx.translate(s * u * 2.2, u * 1.4 + bob); ctx.rotate(s * (0.18 + Math.sin(t * 1.8 + s) * 0.08 - (happy ? 0.9 : 0)));
        rr(-u * 0.3, 0, u * 0.6, u * 2.1, u * 0.3); ctx.fillStyle = "#5b4a8f"; ctx.fill();
        blob(0, u * 2.2, u * 0.45, u * 0.45, FUR_LIGHT, accent, 1.5); ctx.restore();
      });
      // torso with chest panel and blinking lights
      rr(-u * 1.8, u * 0.9 + bob, u * 3.6, u * 3.2, u * 0.7); ctx.fillStyle = furGrad(0, u * 2.5, u * 2); ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 2.2; ctx.stroke();
      rr(-u * 1.1, u * 1.7 + bob, u * 2.2, u * 1.5, u * 0.3); ctx.fillStyle = "#14102a"; ctx.fill();
      ["#5fed83", accent, "#ffd45e"].forEach(function (c, i) {
        ctx.globalAlpha = 0.4 + 0.6 * (Math.sin(t * 3 + i * 1.7) > 0 ? 1 : 0.3);
        blob(-u * 0.6 + i * u * 0.6, u * 2.45 + bob, u * 0.17, u * 0.17, c); ctx.globalAlpha = 1;
      });
      // head tilts toward the pointer
      ctx.translate(cur.x * u * 0.5, -u * 1.2 + cur.y * u * 0.2 + bob); ctx.rotate(cur.x * 0.12);
      ctx.strokeStyle = accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -u * 1.9); ctx.lineTo(0, -u * 2.7 - Math.abs(cur.x) * u * 0.1); ctx.stroke();
      blob(0, -u * 2.9, u * 0.35 + Math.sin(t * 4) * u * 0.05, u * 0.35 + Math.sin(t * 4) * u * 0.05, happy ? "#ffd45e" : "#ff6b8a");
      [-1, 1].forEach(function (s) { rr(s * u * 2.6 - (s < 0 ? u * 0.25 : 0), -u * 0.5, u * 0.25, u * 1, u * 0.1); ctx.fillStyle = "#5b4a8f"; ctx.fill(); });
      rr(-u * 2.6, -u * 1.9, u * 5.2, u * 3.8, u * 1.1); ctx.fillStyle = furGrad(0, 0, u * 3); ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 2.5; ctx.stroke();
      // screen face
      rr(-u * 2.1, -u * 1.4, u * 4.2, u * 2.8, u * 0.8); ctx.fillStyle = "#0b0818"; ctx.fill();
      var glow = ctx.createLinearGradient(0, -u * 1.4, 0, u * 1.4); glow.addColorStop(0, "rgba(95,237,131,0.12)"); glow.addColorStop(1, "rgba(95,237,131,0)");
      rr(-u * 2.1, -u * 1.4, u * 4.2, u * 2.8, u * 0.8); ctx.fillStyle = glow; ctx.fill();
      var blink = (t % 4.5) > 4.38 ? 0.12 : 1;
      [-1, 1].forEach(function (s) {
        var ex = s * u * 0.95 + cur.x * u * 0.35, ey = -u * 0.25 + cur.y * u * 0.3;
        if (happy) { happyEye(ex, ey, u, "#5fed83"); return; }
        ctx.shadowColor = "#5fed83"; ctx.shadowBlur = 12; ctx.fillStyle = "#5fed83";
        rr(ex - u * 0.4, ey - u * 0.5 * blink, u * 0.8, u * 1 * blink, u * 0.35); ctx.fill(); ctx.shadowBlur = 0;
      });
      // equalizer mouth
      ctx.fillStyle = accent;
      for (var i = 0; i < 5; i++) {
        var h = u * (happy ? 0.5 : 0.12) * (1 + 0.9 * Math.abs(Math.sin(t * 5 + i * 1.3)));
        rr(-u * 0.9 + i * u * 0.4, u * 0.85 - h / 2, u * 0.22, h, u * 0.08); ctx.fill();
      }
      ctx.restore();
    }

    function drawOctopus(t, cx, cy, u) {
      var happy = performance.now() < happyUntil, speed = happy ? 4.5 : 1.8, bob = Math.sin(t * 1.5) * u * 0.18;
      ctx.save(); ctx.translate(cx, cy + u * 0.3); ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.globalAlpha = 0.3; blob(0, u * 4.9, u * 2.8 - bob * 0.5, u * 0.4, "#000"); ctx.globalAlpha = 1;
      // tentacles first so the head overlaps their roots
      for (var i = 0; i < 8; i++) {
        var a = (i / 7) * 2 - 1, baseX = a * u * 1.9, dir = a === 0 ? 1 : Math.sign(a);
        var segs = 14, px = baseX, py = u * 0.8 + bob;
        for (var s = 1; s <= segs; s++) {
          var k = s / segs;
          var nx = baseX + a * u * 1.7 * k + Math.sin(t * speed + i * 0.8 - k * 3.2) * u * 0.55 * k + dir * Math.sin(k * 3) * u * 0.2;
          var ny = u * 0.8 + bob + u * 4.1 * k * (1 - Math.abs(a) * 0.12);
          ctx.strokeStyle = s % 2 ? "#7a4fd0" : "#8a5fe0"; ctx.lineWidth = u * 0.75 * (1 - k * 0.72);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
          if (s % 3 === 0 && k < 0.9) blob(nx, ny + u * 0.1, u * 0.1, u * 0.1, "#d9c6ff");
          px = nx; py = ny;
        }
      }
      // head leans with the pointer
      ctx.translate(cur.x * u * 0.5, -u * 0.9 + cur.y * u * 0.25 + bob); ctx.rotate(cur.x * 0.1);
      var g = ctx.createRadialGradient(-u, -u * 1.5, u * 0.3, 0, 0, u * 3.2); g.addColorStop(0, "#a479f2"); g.addColorStop(1, "#6a3fc2");
      ctx.beginPath(); ctx.moveTo(-u * 2.8, u * 1.3);
      ctx.bezierCurveTo(-u * 3.2, -u * 2.6, -u * 1.6, -u * 3.3, 0, -u * 3.3);
      ctx.bezierCurveTo(u * 1.6, -u * 3.3, u * 3.2, -u * 2.6, u * 2.8, u * 1.3);
      ctx.bezierCurveTo(u * 1.5, u * 2, -u * 1.5, u * 2, -u * 2.8, u * 1.3); ctx.closePath();
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 2.2; ctx.stroke();
      // spots
      ctx.globalAlpha = 0.35; [[-1.6, -1.9, 0.38], [1.5, -2.1, 0.3], [0.2, -2.8, 0.24], [2.0, -0.9, 0.2]].forEach(function (p) { blob(p[0] * u, p[1] * u, p[2] * u, p[2] * u, "#e6d9ff"); }); ctx.globalAlpha = 1;
      // eyes
      var blink = (t % 4.2) > 4.08 ? 0.1 : 1;
      [-1, 1].forEach(function (s) {
        var ex = s * u * 1.15, ey = -u * 0.2;
        if (happy) { happyEye(ex, ey, u, "#fff"); return; }
        ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, u * 0.75, u * 0.85 * blink, 0, 0, 6.283); ctx.clip();
        ctx.fillStyle = "#fff"; ctx.fillRect(ex - u, ey - u, u * 2, u * 2);
        var px = ex + cur.x * u * 0.35, py = ey + cur.y * u * 0.4;
        ctx.fillStyle = "#1a1030"; ctx.beginPath(); ctx.arc(px, py, u * 0.45, 0, 6.283); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(px - u * 0.14, py - u * 0.16, u * 0.12, 0, 6.283); ctx.fill();
        ctx.restore();
      });
      ctx.globalAlpha = 0.4; blob(-u * 2.1, u * 0.65, u * 0.4, u * 0.25, "#ff8fb1"); blob(u * 2.1, u * 0.65, u * 0.4, u * 0.25, "#ff8fb1"); ctx.globalAlpha = 1;
      ctx.strokeStyle = "#1a1030"; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, u * 0.45, u * (happy ? 0.55 : 0.4), 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      ctx.restore();
    }

    function drawGhost(t, cx, cy, u) {
      var happy = performance.now() < happyUntil, float = Math.sin(t * 1.6) * u * 0.35;
      ctx.save(); ctx.translate(cx, cy);
      ctx.globalAlpha = 0.3 - float / u * 0.1; blob(0, u * 4.9, u * (2.4 - float / u * 0.4), u * 0.38, "#000"); ctx.globalAlpha = 1;
      ctx.translate(cur.x * u * 0.4, float - u * 0.2); ctx.rotate(cur.x * 0.12 + Math.sin(t * 1.1) * 0.03);
      // aura
      var aura = ctx.createRadialGradient(0, u * 1, u * 1, 0, u * 1, u * 5.2);
      aura.addColorStop(0, "rgba(174,133,255,0.35)"); aura.addColorStop(1, "rgba(174,133,255,0)");
      ctx.fillStyle = aura; ctx.fillRect(-u * 6, -u * 5, u * 12, u * 12);
      // body with a wavy hem
      var top = -u * 3.4, bottom = u * 4, w = u * 2.9;
      ctx.beginPath(); ctx.moveTo(-w, bottom);
      ctx.lineTo(-w, 0); ctx.bezierCurveTo(-w, top * 1.05, w, top * 1.05, w, 0); ctx.lineTo(w, bottom);
      var n = 4, seg = (w * 2) / n;
      for (var i = 0; i < n; i++) {
        var x1 = w - i * seg, wob = Math.sin(t * 3 + i) * u * 0.18;
        ctx.quadraticCurveTo(x1 - seg / 2, bottom - u * 0.9 + wob, x1 - seg, bottom);
      }
      ctx.closePath();
      var g = ctx.createLinearGradient(0, top, 0, bottom); g.addColorStop(0, "#fbf8ff"); g.addColorStop(1, "#c6b0f5");
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 2.4; ctx.stroke();
      // arms
      [-1, 1].forEach(function (s) {
        ctx.save(); ctx.translate(s * w * 0.98, u * 1.6); ctx.rotate(s * (0.7 + Math.sin(t * 2 + s) * 0.15 + (happy ? 0.6 : 0)));
        blob(0, u * 0.6, u * 0.5, u * 0.95, "#e7dcff", accent, 1.8); ctx.restore();
      });
      // face
      var blink = (t % 5) > 4.88 ? 0.1 : 1;
      [-1, 1].forEach(function (s) {
        var ex = s * u * 1.1 + cur.x * u * 0.3, ey = -u * 0.9 + cur.y * u * 0.3;
        if (happy) { happyEye(ex, ey, u, "#2a1a52"); return; }
        blob(ex, ey, u * 0.55, u * 0.8 * blink, "#1a1030");
        blob(ex - u * 0.15, ey - u * 0.3 * blink, u * 0.15, u * 0.17 * blink, "#fff");
      });
      ctx.globalAlpha = 0.5; blob(-u * 1.9, u * 0.1, u * 0.45, u * 0.28, "#ff8fb1"); blob(u * 1.9, u * 0.1, u * 0.45, u * 0.28, "#ff8fb1"); ctx.globalAlpha = 1;
      ctx.fillStyle = "#1a1030"; ctx.beginPath();
      if (happy) ctx.ellipse(cur.x * u * 0.2, u * 0.6, u * 0.35, u * 0.5, 0, 0, 6.283);
      else ctx.ellipse(cur.x * u * 0.2, u * 0.55, u * 0.22, u * (0.2 + 0.08 * Math.sin(t * 2)), 0, 0, 6.283);
      ctx.fill();
      ctx.restore();
    }

    var TYPES = { cat: drawCat, robot: drawRobot, octopus: drawOctopus, ghost: drawGhost };
    var type = TYPES[opts.type] ? opts.type : "cat";

    canvas.addEventListener("mousedown", function () { happyUntil = performance.now() + 900; });
    canvas.style.cursor = "pointer";

    function draw(now) {
      raf = requestAnimationFrame(draw);
      if (!visible) return;
      var t = (now - t0) / 1000;
      cur.x += (target.x - cur.x) * 0.08; cur.y += (target.y - cur.y) * 0.08;
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2, u = Math.min(W, H) / 12.5;

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

      TYPES[type](t, cx, cy + u * 0.2, u);
    }
    size();
    global.addEventListener("resize", size);
    global.addEventListener("mousemove", move);
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(canvas);
    if (reduce) { draw(t0); cancelAnimationFrame(raf); return { setType: function (n) { if (TYPES[n]) { type = n; draw(performance.now()); cancelAnimationFrame(raf); } } }; }
    raf = requestAnimationFrame(draw);
    return { setType: function (n) { if (TYPES[n]) type = n; } };
  }

  global.UniverseFX = { cursorTrail: cursorTrail, unscramble: unscramble, mascot: mascot };
})(window);
