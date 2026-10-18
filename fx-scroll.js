/* universe-fx scroll & section effects (original code, dependency-free).
   Extends window.UniverseFX. Load after fx.js.
   progress(el)          scroll progress bar (scaleX)
   autoHideNav(nav)      nav slides away on scroll down, back on scroll up
   wordScrub(el)         words light up as the paragraph scrolls through view
   counters(selector)    numbers count up when they enter view (data-count, data-suffix)
   countTo(el, n)        count a single element to n
   spotlight(selector)   cursor-following glow + subtle 3D tilt on hover
   magnetic(selector)    elements drift toward the cursor
   parallax(selector)    data-speed vertical parallax
   hscroll(section)      vertical scroll drives a pinned horizontal track
   dotField(canvas)      interactive dot grid with cursor bulge and click ripples */
(function (global) {
  "use strict";
  var U = global.UniverseFX = global.UniverseFX || {};
  var reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = global.matchMedia && global.matchMedia("(pointer: fine)").matches;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var subs = [], ticking = false;
  function run() { ticking = false; for (var i = 0; i < subs.length; i++) subs[i](); }
  function queue() { if (!ticking) { ticking = true; requestAnimationFrame(run); } }
  function onScroll(fn) { subs.push(fn); fn(); }
  global.addEventListener("scroll", queue, { passive: true });
  global.addEventListener("resize", queue);

  U.progress = function (el) {
    onScroll(function () {
      var max = document.documentElement.scrollHeight - global.innerHeight;
      el.style.transform = "scaleX(" + (max > 0 ? clamp(global.scrollY / max, 0, 1) : 0) + ")";
    });
  };

  U.autoHideNav = function (nav) {
    var last = global.scrollY;
    onScroll(function () {
      var y = global.scrollY;
      nav.classList.toggle("fx-nav-hide", y > last && y > 240);
      last = y;
    });
  };

  U.wordScrub = function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", words.join(" "));
    el.textContent = "";
    var spans = words.map(function (w) {
      var s = document.createElement("span");
      s.className = "fx-word"; s.textContent = w; s.setAttribute("aria-hidden", "true");
      el.append(s, " ");
      return s;
    });
    if (reduce) { spans.forEach(function (s) { s.classList.add("on"); }); return; }
    onScroll(function () {
      var r = el.getBoundingClientRect(), vh = global.innerHeight;
      var p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
      var n = Math.round(p * spans.length);
      spans.forEach(function (s, i) { s.classList.toggle("on", i < n); });
    });
  };

  function countTo(el, to) {
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduce || !to) { el.textContent = to + suffix; return; }
    var t0 = performance.now(), dur = 1600;
    (function step(now) {
      var k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(to * e) + suffix;
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  U.countTo = countTo;
  U.counters = function (selector) {
    var els = [].slice.call(document.querySelectorAll(selector));
    var obs = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        var n = parseFloat(e.target.getAttribute("data-count"));
        if (!isNaN(n)) countTo(e.target, n);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { obs.observe(el); });
  };

  U.spotlight = function (selector) {
    if (!fine) return;
    [].forEach.call(document.querySelectorAll(selector), function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--mx", (x * 100) + "%");
        el.style.setProperty("--my", (y * 100) + "%");
        if (!reduce) {
          el.style.setProperty("--rx", ((0.5 - y) * 7).toFixed(2) + "deg");
          el.style.setProperty("--ry", ((x - 0.5) * 9).toFixed(2) + "deg");
        }
      });
      el.addEventListener("pointerleave", function () { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); });
    });
  };

  U.magnetic = function (selector, strength) {
    if (!fine || reduce) return;
    var k = strength || 0.3;
    [].forEach.call(document.querySelectorAll(selector), function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * k).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * k).toFixed(1) + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  };

  U.parallax = function (selector) {
    if (reduce) return;
    var els = [].slice.call(document.querySelectorAll(selector));
    onScroll(function () {
      var vh = global.innerHeight;
      els.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        var speed = parseFloat(el.getAttribute("data-speed")) || 0.2;
        el.style.transform = "translate3d(0," + ((r.top + r.height / 2 - vh / 2) * speed).toFixed(1) + "px,0)";
      });
    });
  };

  U.hscroll = function (section) {
    var stick = section.querySelector(".hs-stick"), track = section.querySelector(".hs-track");
    if (reduce) return;
    function layout() { section.style.height = (track.scrollWidth - global.innerWidth + global.innerHeight) + "px"; }
    layout();
    global.addEventListener("resize", layout);
    onScroll(function () {
      var r = section.getBoundingClientRect(), total = r.height - global.innerHeight;
      var p = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
      track.style.transform = "translate3d(" + (-p * (track.scrollWidth - global.innerWidth)).toFixed(1) + "px,0,0)";
      section.style.setProperty("--p", p.toFixed(3));
    });
  };

  U.dotField = function (canvas, o) {
    o = o || {};
    var ctx = canvas.getContext("2d"), host = canvas.parentElement, sp = o.spacing || 26;
    var W = 0, H = 0, mx = -999, my = -999, ripples = [], vis = true;
    function size() {
      var dpr = Math.min(global.devicePixelRatio || 1, 2), r = canvas.getBoundingClientRect();
      W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) draw(performance.now());
    }
    function pos(e) { var r = canvas.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; }
    host.addEventListener("pointermove", pos);
    host.addEventListener("pointerleave", function () { mx = my = -999; });
    host.addEventListener("pointerdown", function (e) { pos(e); ripples.push({ x: mx, y: my, t: performance.now() }); });
    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      ripples = ripples.filter(function (r) { return now - r.t < 2400; });
      var t = now / 1000;
      for (var x = sp / 2; x < W; x += sp) for (var y = sp / 2; y < H; y += sp) {
        var dx = x - mx, dy = y - my, d = Math.sqrt(dx * dx + dy * dy), f = Math.max(0, 1 - d / 170);
        var ox = d > 0 ? dx / d * f * f * 16 : 0, oy = d > 0 ? dy / d * f * f * 16 : 0;
        var r = 1.3 + f * 3.4 + (reduce ? 0 : 0.5 * Math.sin((x + y) * 0.02 + t * 1.5)), glow = 0;
        for (var i = 0; i < ripples.length; i++) {
          var age = (now - ripples[i].t) / 1000, dd = Math.abs(Math.hypot(x - ripples[i].x, y - ripples[i].y) - age * 420);
          if (dd < 38) { var k = (1 - dd / 38) * (1 - age / 2.4); glow += k; r += k * 4; }
        }
        var a = Math.min(1, f + glow);
        ctx.fillStyle = a > 0.03 ? "hsla(" + (255 + f * 80 + glow * 70) + ",90%," + (62 + glow * 14) + "%," + (0.35 + a * 0.65) + ")" : "rgba(130,110,180,.28)";
        ctx.beginPath(); ctx.arc(x + ox, y + oy, Math.max(0.6, r), 0, 6.283); ctx.fill();
      }
    }
    function loop(now) { if (vis) draw(now); requestAnimationFrame(loop); }
    size(); global.addEventListener("resize", size);
    if (reduce) return;
    new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe(canvas);
    requestAnimationFrame(loop);
  };
})(window);
