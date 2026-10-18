# universe-fx-kit

**Live demo: https://ryanbowie.github.io/universe-fx-kit/**

A showcase of interactive web effects inspired by githubuniverse.com, for use on GitHub Pages sites. Dependency-free vanilla JS/CSS, with original code and artwork. Respects `prefers-reduced-motion`.

## What's in the demo

| Effect | API | File |
|---|---|---|
| Snap-to-grid coloured glyph cursor trail (skips text, links, nav) | `UniverseFX.cursorTrail()` | `fx.js` |
| Nav text that decodes when you leave it | `UniverseFX.unscramble(selector)` | `fx.js` |
| Octopus mascot that follows the cursor over a rippling dot grid | `UniverseFX.mascot(canvas, { type: "octopus" })` | `fx.js` |
| Terminal-style typed text with blinking caret | `UniverseFX.typewriter(el, text)` | `fx.js` |
| Scroll reveal with staggered rise and wipe | `UniverseFX.reveal(selector)` | `fx.js`, `fx.css` |
| Shark Dodge mini game | `UniverseFX.game({ canvas })` | `game.js` |

Include `fx.css`, `fx.js` (and `game.js` for the game), then call the functions as in `index.html`. Add `data-fx-no-trail` to any element to suppress the cursor trail there.

Community project built with GitHub Copilot. Not a Microsoft or GitHub product.

Licensed under MIT.
