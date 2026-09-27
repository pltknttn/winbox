# WinBox.js — Component Architecture

> Deep-dive reference for the WinBox component internals, DOM anatomy, CSS
> architecture, JavaScript module system, state lifecycle, and build pipeline.
>
> **Related visual reference:** `demo/boilerplate.svg` — an annotated SVG diagram
> of the component layout. Every `.wb-*` class labeled in that diagram is
> described below with its source location and CSS rules.

---

## 1. Project at a Glance

| Field | Value |
|---|---|
| **Name** | WinBox.js — Modern HTML5 Window Manager for the Web |
| **Version** | 0.2.83 |
| **Author** | Thomas Wilkerling (ts-thomas) |
| **License** | Apache-2.0 |
| **Dependencies** | **Zero runtime dependencies.** Build-time only: `less`, `terser`, `csso`, `svgo`, `babel`, `jest` |
| **Entry (ESM)** | `src/js/winbox.js` — `export default WinBox` |
| **Entry (bundle)** | `dist/winbox.bundle.min.js` — all-in-one (JS + CSS + HTML + icons as base64) |
| **Entry (non-bundle)** | `dist/js/winbox.min.js` + `dist/css/winbox.min.css` |

### Core Design Principles

- **No frameworks.** Pure vanilla JavaScript (ES6 modules). No React, no Vue,
  no jQuery.
- **Performance-first.** Uses `requestAnimationFrame` for drag/resize batching,
  passive event listeners for touch/wheel, `will-change` for compositor hints,
  and a custom `setStyle`/`setAttribute` caching layer to avoid redundant DOM
  writes.
- **Single DOM template.** The window markup is defined once as a string in
  `template.js`, cached in a singleton `<div>`, and cloned for every instance.
- **Class-driven state.** All visual states (minimized, maximized, focused,
  hidden, modal, fullscreen) are expressed as CSS classes toggled on the root
  `.winbox` element — no inline style manipulation for state.

---

## 2. Repository Layout (Quick Reference)

```
winbox/
├── src/                          # Source — what gets published to npm
│   ├── js/
│   │   ├── winbox.js             # Main module (constructor + prototype + helpers)
│   │   ├── template.js           # DOM template factory (singleton cache + clone)
│   │   ├── helper.js             # DOM/event utility functions
│   │   └── webpack.js            # Export manifest (tells terser what to keep)
│   ├── css/
│   │   ├── winbox.less           # Main stylesheet source (LESS)
│   │   ├── winbox.css            # Compiled from winbox.less (checked in)
│   │   ├── images.less           # LESS variables: @min, @max, @close, @full, @restore
│   │   ├── control.less          # Utility / control classes (.no-*, .wb-hide, .wb-show)
│   │   └── themes/
│   │       ├── base.less   # Shared foundation: --wb-* variables + .wb-theme() mixin
│   │       ├── modern.less       # Gradient header, dark body, popup animation
│   │       ├── white.less        # Flat white header, dark text, square corners
│   │       ├── fluent.less       # Microsoft Fluent-inspired palette
│   │       ├── material.less     # Google Material-inspired palette
│   │       ├── dark.less         # Dark body, orange-red header
│   │       └── default.less      # Radzen-inspired orange/red header
│   └── img/
│       ├── min.svg, max.svg, close.svg, full.svg, restore.svg, exit.svg
├── dist/                         # Build output (what CDN users consume)
│   ├── css/winbox.min.css        # Minified + optimized core CSS
│   ├── css/themes/*.min.css      # Minified theme files
│   ├── js/winbox.min.js          # Minified ES5 bundle
│   ├── winbox.bundle.min.js      # All-in-one bundle (JS+CSS+icons as base64)
│   └── img/*.svg                 # Optimized SVG icons
├── demo/                         # Live demo site
│   ├── index.html                # Demo page with all code examples
│   ├── style.css                 # Demo styling (not part of the library)
│   └── *.svg                     # Logo, icons, boilerplate diagram
├── task/                         # Build scripts (Node.js, CommonJS)
│   ├── build.js                  # JS minification (terser) — non-bundle & bundle
│   ├── bundle.js                 # CSS-to-JS inlining (--image) and CSS extraction (--style)
│   ├── copy.js                   # Copy src/img → dist/img
│   ├── svgo.js                   # Optimize SVGs in dist/img
│   ├── clean.js                  # Wipe dist/
│   └── server.js                 # Local HTTP server (port 8080)
├── tests/                        # Jest tests (jsdom)
│   └── helper.test.js            # Unit tests for helper.js utilities
├── tmp/                          # Build intermediates (gitignored)
│   ├── bundle.less               # Generated: imports winbox.less + images.less
│   ├── images.less               # Generated: base64 data URIs for icons
│   └── style.js                  # Generated: CSS as JS string (for bundle)
├── index.html                    # Local development entry point
├── package.json                  # npm scripts + devDependencies
├── babel.config.json             # Babel config for Jest
└── jest.config.cjs               # Jest configuration
```

---

## 3. DOM Anatomy (Visual Reference: `demo/boilerplate.svg`)

The `boilerplate.svg` diagram shows the component layout overlaid on a 780×600
canvas. Below is the corresponding DOM tree and a text-based layout matching the SVG.

### 3.1 DOM Tree

This is the exact HTML string defined in `src/js/template.js` (`templateHTML`):

```
<div class="winbox" id="winbox-1">            ← root element (this.dom, this.window)
├── <div class="wb-header">                  ← title bar (fixed height, default 35px)
│   ├── <div class="wb-control">             ← control buttons container (float: right)
│   │   ├── <span class="wb-min"></span>     ← minimize button (toggles minimize)
│   │   ├── <span class="wb-max"></span>     ← maximize button (toggles maximize)
│   │   ├── <span class="wb-full"></span>    ← fullscreen button (fullscreen API)
│   │   └── <span class="wb-close"></span>   ← close button
│   └── <div class="wb-drag">                ← draggable area (cursor: move)
│       ├── <div class="wb-icon"></div>      ← optional titlebar icon
│       └── <div class="wb-title"></div>     ← window title text
├── <div class="wb-body"></div>              ← main content area (scrollable)
├── <div class="wb-n"></div>                 ← resize handle: North
├── <div class="wb-s"></div>                 ← resize handle: South
├── <div class="wb-w"></div>                 ← resize handle: West
├── <div class="wb-e"></div>                 ← resize handle: East
├── <div class="wb-nw"></div>                ← resize handle: North-West corner
├── <div class="wb-ne"></div>                ← resize handle: North-East corner
├── <div class="wb-se"></div>                ← resize handle: South-East corner
└── <div class="wb-sw"></div>                ← resize handle: South-West corner
```

### 3.2 Layout Diagram (matching `boilerplate.svg`)

```
  ┌─────────────────────────────────────────────────────────┐
  │  .wb-header (height: 35px)                              │
  │  ┌─────────────────────────────────────────────────────┐ │
  │  │ [icon]  .wb-title                    [min][max][•][×]│ │
  │  │  .wb-drag                              .wb-control │ │
  │  └─────────────────────────────────────────────────────┘ │
  │  ←── .wb-n ──────────→  (10px hit area, top edge)      │
  │  ┌─.wb-nw─.wb-n─.wb-ne─┐                               │
  │  │                    │                               │
  │  │  .wb-body (content area)                            │
  │  │  ┌───────────────────────────────────────────────┐  │
  │  │  │  margin = border width (default 0)            │  │
  │  │  │  scrollable content goes here                 │  │
  │  │  └───────────────────────────────────────────────┘  │
  │  │                    │                               │
  │  └─.wb-sw─.wb-s─.wb-se─┘                               │
  │  ←── .wb-w ──────────→  (10px hit area, left edge)    │
  │  ←──────────────────→  (10px hit area, right edge) ←── │
  └────────────────────────────────────────────────────────┘
  
  wb-max/wb-close: 30px wide × 100% height, float right
  wb-min: 30px wide × 100% height
  wb-full: 30px wide × 100% height
  
  Resize handles (.wb-n/s/e/w/nw/ne/sw/se) are 10-15px invisible hit areas
  positioned at the edges and corners. They extend 5px beyond the window
  boundary (negative offset) for easier grabbing.
  
  When modal:
    - .winbox.modal:before — semi-transparent overlay (inherits background)
    - .winbox.modal:after  — dark backdrop (#0d1117) with fade-in animation
    - wb-min/max/full are hidden
    - body content & drag receive pointer-events:none
```

### 3.3 Element Roles

| Element | Purpose | CSS File | JS Handler |
|---|---|---|---|
| `.winbox` | Root container. Receives all state classes. | `winbox.less`, `base.less` | Constructor sets id, className |
| `.wb-header` | Fixed-height title bar. Contains controls + drag area. | `winbox.less` | Constructor (height/line-height set if `header` option provided) |
| `.wb-control` | Float-right container for the 4 control buttons. | `winbox.less` | `addControl()` inserts into this |
| `.wb-min` / `.wb-max` / `.wb-full` / `.wb-close` | Control buttons. Icons set via LESS variables (`@min`, `@max`, `@full`, `@close`). | `winbox.less` | `register()` binds click handlers |
| `.wb-drag` | Left portion of header — draggable area + icon/title. | `winbox.less` | `addWindowListener(self, "drag")` binds mousedown |
| `.wb-icon` | Optional titlebar icon (hidden by default). | `winbox.less` | `setIcon()` makes visible + sets background-image |
| `.wb-title` | Title text element. | `winbox.less` | `setTitle()` sets text via `setText()` |
| `.wb-body` | Scrollable content area. Position: absolute, top = header height. | `winbox.less`, `base.less` | Constructor, `mount()`, `unmount()`, `setUrl()` |
| `.wb-n` `.wb-s` `.wb-w` `.wb-e` | Edge resize handles (10px × full edge). | `winbox.less` | `addWindowListener(self, dir)` for each direction |
| `.wb-nw` `.wb-ne` `.wb-sw` `.wb-se` | Corner resize handles (15px × 15px). | `winbox.less` | `addWindowListener(self, dir)` for each direction |

---

## 4. CSS Architecture

### 4.1 State Classes (on `.winbox`)

These are toggled by JS methods. The `README.md` note says state classes
(`max`, `min`, `full`, `hidden`, `focus`) **cannot** be set manually — use the
corresponding methods instead.

| Class | Toggled by | CSS Effect |
|---|---|---|
| `.min` | `minimize()` / `restore()` | Hides `.wb-body > *` and `.wb-full`, `.wb-min`. Shows body via `display: revert` for `.wb-show`. Drag cursor → default. |
| `.max` | `maximize()` / `restore()` | Removes `box-shadow`. Body margin → 0. |
| `.modal` | Constructor (`modal: true`) | Adds overlay (`:before` + `:after`). Hides min/max/full buttons. Disables pointer events on body content. |
| `.hide` | `hide()` / `show()` | `display: none` on the entire window. |
| `.focus` | `focus()` / `blur()` | In themed windows: sets header background to `--wb-header-bg` (dimmed state when unfocused). |
| `.no-full` | Constructor (when no fullscreen API) | Hides the fullscreen button (added via `addClass`). |

### 4.2 Control / Utility Classes

Defined in `src/css/control.less`. These are "control classes" — passed at
construction via the `class` option or toggled at runtime with `addClass()` /
`removeClass()` / `toggleClass()`.

| Class | Selector Target | Effect |
|---|---|---|
| `.no-animation` | `.winbox` | `transition: none` |
| `.no-shadow` | `.winbox` | `box-shadow: none` |
| `.no-header` | `.wb-header` | `display: none`; `.wb-body { top: 0 }` |
| `.no-min` | `.wb-min` | `display: none` |
| `.no-max` | `.wb-max` | `display: none` |
| `.no-full` | `.wb-full` | `display: none` |
| `.no-close` | `.wb-close` | `display: none` |
| `.no-resize` | `.wb-body ~ div` | `display: none` (hides all resize handles) |
| `.no-move` | `.wb-title` (when not `.min`) | `pointer-events: none` (title doesn't initiate drag) |
| `.wb-hide` | inside `.wb-body` | `display: none` |
| `.wb-show` | `.wb-body .wb-show` | `display: revert` (overrides `.wb-show { display: none }`) |

### 4.3 Theme System

The theme system is built on CSS custom properties (variables) with a
two-layer specificity strategy:

1. **Fallbacks** are defined on `.winbox` (specificity 0,1,0) in `base.less`.
2. **Theme overrides** are defined on `.winbox.<theme>` (specificity 0,2,0)
   in individual theme files (`modern.less`, `white.less`, `fluent.less`,
   `material.less`, `dark.less`, `default.less`).

Every theme file:
1. `@import "base.less"` — pulls in the shared foundation
2. Declares a `.winbox.<theme>` rule that calls `.wb-theme();` (the mixin)
3. Overrides `--wb-*` variables to set the palette

#### Theme Variables (CSS Custom Properties)

| Variable | Default (on `.winbox`) | Description |
|---|---|---|
| `--wb-header-bg` | `#0050ff` | Header background color / gradient |
| `--wb-header-bg-unfocused` | `#666` | Dimmed header when not focused |
| `--wb-header-color` | `#ffffff` | Header text color |
| `--wb-header-border` | `none` | Header bottom border |
| `--wb-header-height` | `35px` | Header height (also sets body `top` offset) |
| `--wb-title-color` | `#ffffff` | Title text color |
| `--wb-title-font-size` | `13px` | Title font size |
| `--wb-title-font-weight` | `600` | Title font weight |
| `--wb-title-text-transform` | `uppercase` | Title text transform |
| `--wb-body-bg` | `#ffffff` | Body background |
| `--wb-body-color` | `#000000` | Body text color |
| `--wb-body-margin` | `4px` | Body inner margin (= border width) |
| `--wb-border-radius` | `12px 12px 0 0` | Window border radius |
| `--wb-box-shadow` | `0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)` | Window shadow |
| `--wb-animation` | `popup 0.3s cubic-bezier(0.3, 1, 0.3, 1) forwards` | Open animation |
| `--wb-control-opacity` | `0.65` | Control button opacity |
| `--wb-control-hover-opacity` | `1` | Control button hover opacity |
| `--wb-control-filter` | `none` | CSS filter on control buttons (e.g. `invert(1)`) |
| `--wb-scrollbar-thumb` | `#888` | Scrollbar thumb color |
| `--wb-scrollbar-thumb-inactive` | `#777` | Inactive scrollbar thumb |
| `--wb-scrollbar-size` | `12px` | Scrollbar size |

**Runtime theme override:** Any variable can be changed at runtime by setting
it directly on the DOM element:
```js
winbox.dom.style.setProperty("--wb-body-bg", "#e3f2fd");
```

#### Theme Palette Sources

| Theme | Header BG | Body BG | Body Text | Animation | Border Radius | Source Inspiration |
|---|---|---|---|---|---|---|
| `modern` | `linear-gradient(90deg, #ff00f0, #0050ff)` | `#131820` | `#ffffff` | `popup` | `12px 12px 0 0` | Gradient header |
| `white` | `#ffffff` | `#ffffff` | `#222222` | `none` | `0` | Flat light |
| `fluent` | `#0078d4` | `#faf9f8` | `#323130` | `none` | `8px 8px 0 0` | Microsoft Fluent |
| `material` | `#4340d2` | `#f5f5f5` | `#212121` | `none` | `8px 8px 0 0` | Google Material |
| `dark` | `#ff6d41` | `#38474e` | `#f6f7fa` | `none` | `8px 8px 0 0` | Radzen dark |
| `default` | `#ff6d41` | `#f6f7fa` | `#545e61` | `none` | `8px 8px 0 0` | Radzen default |

#### `@keyframes popup`

Defined in `base.less`. Scales the window from `0.8` to `1.0` with a
custom easing curve. Only themed windows with `--wb-animation: popup ...` use it;
themes that set `--wb-animation: none` skip it.

---

## 5. JavaScript Architecture

### 5.1 Module Structure

```
template.js  →  helper.js  →  winbox.js  →  webpack.js (export manifest)
```

| Module | Responsibility | Key Exports |
|---|---|---|
| `helper.js` | Stateless DOM utilities. No side effects at import. | `addListener`, `removeListener`, `preventEvent`, `getByClass`, `addClass`, `removeClass`, `hasClass`, `setStyle`, `setAttribute`, `removeAttribute`, `setText` |
| `template.js` | DOM template factory. Singleton cache + clone. | `default function(tpl)` — returns a cloned DOM subtree |
| `winbox.js` | Core: constructor, prototype methods, module state, event binding. | `default WinBox` (constructor) |
| `webpack.js` | Build-time export manifest. Lists all methods/props to preserve during minification. | `window["WinBox"] = WinBox` |

### 5.2 Module-Level State (`winbox.js`)

| Variable | Type | Purpose |
|---|---|---|
| `body` | `HTMLElement` | Cached `document.body`. Lazily initialized in `setup()`. |
| `id_counter` | `number` (starts 0) | Auto-incrementing ID counter for `winbox-N` IDs |
| `index_counter` | `number` (starts 10) | z-index counter. Increased on focus so topmost window has highest z-index |
| `stack_win` | `WinBox[]` | All live window instances (for focus ordering) |
| `stack_min` | `WinBox[]` | Minimized windows (for split-screen layout) |
| `root_w`, `root_h` | `number` | Viewport width/height (updated on resize via `init()`) |
| `prefix_request` | `string` | Fullscreen API method name (e.g. `"requestFullscreen"`, `"webkitRequestFullscreen"`) |
| `prefix_exit` | `string` | Fullscreen exit method name |
| `is_fullscreen` | `WinBox\|undefined` | Reference to the currently fullscreened window |
| `window_clicked` | `boolean` | Tracks whether the last mousedown was on a window (prevents blur-on-click) |
| `use_raf` | `boolean` (`false`) | Toggles requestAnimationFrame batching for drag/resize |
| `eventOptions` / `eventOptionsPassive` | `Object` | `{ capture: true, passive: false }` / `{ capture: true, passive: true }` |

### 5.3 Constructor Flow

```
new WinBox(params, _title)
  │
  ├─→ body || setup()           // lazy init: body ref, fullscreen prefixes, global listeners
  ├─→ Parse options             // string → title; object → destructure all fields
  ├─→ this.dom = template(tpl)  // clone DOM subtree from template.js
  ├─→ Set id, className, window/body refs
  ├─→ stack_win.push(this)      // register in global stack
  ├─→ Apply background, border, header height
  ├─→ Set title, icon, mount/html/url content
  ├─→ Parse geometry: top/right/left/bottom → viewport limits
  ├─→ Parse size: minwidth/minheight/maxwidth/maxheight (with defaults)
  ├─→ Compute width/height (autosize or explicit)
  ├─→ Parse position: x/y (supports "center", "right", "bottom", px, %)
  ├─→ Assign all instance properties (x, y, width, height, minwidth, ...)
  ├─→ Assign state flags (min, max, full, hidden, focused = false)
  ├─→ Assign callbacks (onclose, onfocus, onblur, onmove, onresize, ...)
  ├─→ Initial state: hidden → hide(); else focus()
  ├─→ Apply custom z-index if `index` option provided
  ├─→ Apply initial state: max → maximize(); min → minimize(); else resize().move()
  ├─→ register(this)            // bind all event listeners
  ├─→ (root || body).appendChild(this.dom)
  └─→ oncreate && oncreate.call(this, params)
```

### 5.4 `setup()` — Global Initialization (runs once)

1. Caches `document.body`
2. Detects fullscreen API prefix by feature-testing `body`'s properties
3. Registers `window` resize listener → calls `init()` + `update_min_stack()`
4. Registers two `body` mousedown listeners (capture + bubble phase):
   - **Capture phase:** resets `window_clicked = false`
   - **Bubble phase:** if `!window_clicked`, blurs the topmost focused window

### 5.5 `init()` — Viewport Measurement

Reads `document.documentElement.clientWidth` and `clientHeight` to set `root_w`
and `root_h`. The commented-out code shows alternatives (scroll vs. client) were
considered; the bounding rect approach was abandoned for precision reasons.

### 5.6 `register(self)` — Per-Window Event Binding

Called during construction. Binds:

1. **Resize handles:** `addWindowListener(self, dir)` for each of
   `"drag"`, `"n"`, `"s"`, `"w"`, `"e"`, `"nw"`, `"ne"`, `"se"`, `"sw"`
2. **Control buttons:**
   - `.wb-min` click → toggle `minimize()` / `restore()`
   - `.wb-max` click → toggle `maximize()` / `restore()` + `focus()`
   - `.wb-full` click → `fullscreen()` + `focus()` (only if fullscreen API exists)
   - `.wb-close` click → `close()` (respects `onclose` return value)
3. **Focus management:**
   - `self.dom` mousedown (capture) → sets `window_clicked = true`
   - `self.body` mousedown (capture) → calls `self.focus()`

### 5.7 `addWindowListener(self, dir)` — Drag & Resize

The core interaction engine. For each handle direction:

- Binds `mousedown` and `touchstart` with `{ capture: true, passive: false }`
- On mousedown:
  - Calls `preventEvent(event, true)` — stops propagation + prevents default
  - Calls `self.focus()`
  - If `drag` handle: checks for double-click (300ms threshold) to trigger
    maximize/restore; if `no-max` class, skips this
  - If not minimized: adds `wb-lock` class to body, starts mousemove/mouseup
    (or touchmove/touchend) listeners with `{ capture: true, passive: true }`
  - Captures initial `x`, `y` coordinates
  - Optionally starts a `requestAnimationFrame` loop for batched updates

- **`handler_mousemove`:** Computes delta from start position. For drag:
  translates position. For resize handles: adjusts `width`/`height` and/or
  `x`/`y` depending on direction (edges resize one axis; corners resize both).
  Applies min/max constraints. If the window was maximized, it auto-restores.
  Updates via `self.resize()` / `self.move()` (which set inline styles and fire
  callbacks). Respects `overflow` option for boundary behavior.

- **`handler_mouseup`:** Removes body `wb-lock` class, removes window listeners,
  cancels RAF loop if active.

### 5.8 State Manager Methods (Prototype)

| Method | Action | Side Effects |
|---|---|---|
| `mount(src)` | Moves DOM element into `.wb-body` | Unmouts previous; stores back-reference on `src._backstore` |
| `unmount(dest)` | Moves body's child back to original parent (or `dest`) | Restores element to `_backstore` or `dest` |
| `setTitle(title)` | Sets `.wb-title` text | `this.title` updated; triggers layout |
| `setIcon(src)` | Sets `.wb-icon` background-image | Makes icon visible (`display: inline-block`) |
| `setBackground(bg)` | Sets root `.winbox` background | Inline `style.background` |
| `setUrl(url, onload)` | Replaces body content with iframe | Creates `<iframe>` with given `src` |
| `focus(state)` | Brings window to front | Increments z-index; `stack_win` reordering; fires `onfocus` |
| `blur(state)` | Sends window to back | Removes `focus` class; fires `onblur` |
| `hide(state)` | Hides window | Adds `hide` class; fires `onhide` |
| `show(state)` | Shows window | Removes `hide` class; fires `onshow` |
| `minimize(state)` | Minimizes window | Adds `min` to `stack_min`; fires `onminimize` |
| `restore()` | Restores from min/max/fullscreen | Removes state; re-resizes; fires `onrestore` |
| `maximize(state)` | Maximizes to viewport | Adds `max`; resize+move to viewport bounds; fires `onmaximize` |
| `fullscreen(state)` | Enters browser fullscreen | Calls `requestFullscreen()`; fires `onfullscreen` |
| `close(force)` | Destroys window | Fires `onclose` (vetoable); removes from stacks; `dom.remove()` |
| `move(x, y)` | Sets position | Inline `left`/`top`; fires `onmove(x, y)` |
| `resize(w, h)` | Sets size | Inline `width`/`height`; fires `onresize(w, h)` |
| `addClass/removeClass/hasClass/toggleClass` | CSS class management | Delegates to `helper.js` |
| `addControl(control)` | Inserts custom button into `.wb-control` | Creates `<span>`, sets class/image/click/innerHTML |
| `removeControl(control)` | Removes a control element | Finds by class name in DOM root |

### 5.9 State Lifecycle

```
                           ┌────────────────────────────────┐
                           │  new WinBox(title, options)    │
                           └────────────┬───────────────────┘
                                        │
                            ┌───────────▼───────────┐
                            │ oncreate(options)     │
                            │  ↓ constructor logic  │
                            │  (parse, template,    │
                            │  geometry, stack_win)  │
                            └───────────┬───────────┘
                                        │
                          if(hidden) ──►│── focus()
                                        │
                      ┌─────────────────┼─────────────────┐
                      │                 │                 │
                 maximize()         minimize()         resize().move()
                (if max:true)       (if min:true)      (default)
                      │                 │                 │
                      ▼                 ▼                 ▼
               ┌──────────┐      ┌──────────┐       ┌──────────┐
               │  .max    │      │  .min     │       │ windowed │
               └────┬─────┘      └─────┬─────┘       └─────┬────┘
                    │                  │                   │
        focus() ◄───┼── blur()    restore()           any method
              or maximize() ◄── maximize()           triggers
              or close()      or minimize()         transition

  Transitions:
  maximize() → restore()  → removes .max, re-sizes to previous dimensions
  minimize() → restore()  → removes .min from stack_min, re-sizes
  minimize() → maximize() → removes .min, then applies .max
  fullscreen() → restore()  → cancels fullscreen API, restores windowed
  focus() → blur()          → toggles .focus class, z-index swap
  hide() → show()           → toggles .hide class
  close()                   → dom.remove(), removed from stack_win,
                              onclose() can veto (returns truthy)
```

### 5.10 Focus & Z-Index Management

- Windows are stored in `stack_win[]` (push order = creation order).
- `focus()` scans `stack_win` from the top (last added) for a currently focused
  window, blurs it, then **moves the current window to the end** of the array via
  `splice` + `push` — bringing it to the front.
- z-index is managed by `index_counter` (starts at 10, increments on each focus).
- A body-level `mousedown` listener (capture + bubble) tracks `window_clicked`
  to distinguish clicks *on* a window from clicks *outside* windows — only the
  latter triggers blur of the topmost window.

### 5.11 Drag / Resize Constraints

During `handler_mousemove` in `addWindowListener`:

- **Width:** `Math.max(Math.min(self.width, self.maxwidth, root_w - self.x - self.right), self.minwidth)`
- **Height:** `Math.max(Math.min(self.height, self.maxheight, root_h - self.y - self.bottom), self.minheight)`
- **X:** `Math.max(Math.min(self.x, overflow ? root_w - 30 : root_w - self.width - self.right), overflow ? 30 - self.width : self.left)`
- **Y:** `Math.max(Math.min(self.y, overflow ? root_h - self.header : root_h - self.height - self.bottom), self.top)`

If `overflow` is falsy, the window is constrained to the viewport (minus
`left`/`right`/`top`/`bottom` boundaries). If `overflow` is truthy, the window
can move ~30px outside.

When a maximized window is dragged, `restore()` is called automatically.

---

## 6. Build System

### 6.1 Build Pipeline (`npm run build`)

```
npm run clean          → task/clean.js   → wipe dist/
npm run copy           → task/copy.js    → copy src/img → dist/img
npm run build:svg      → task/svgo.js    → optimize dist/img/*.svg
npm run build:css      → lessc           → compile SCSS → winbox.css
npm run build:css:bundle → node task/bundle --image →
  1. lessc tmp/bundle.less dist/css/winbox.min.css  (LESS with base64 images)
  2. csso dist/css/winbox.min.css                   (CSS optimization)
npm run build:css:theme-* → lessc + csso per theme
node task/bundle --style   → extract CSS into tmp/style.js (for bundle)
npm run build:js         → task/build.js (terser, non-bundle)
npm run build:bundle     → task/build.js --bundle (terser, all-in-one)
```

### 6.2 Distribution Formats

| Format | Files | Use Case |
|---|---|---|
| **Bundle** | `dist/winbox.bundle.min.js` | All-in-one: JS + CSS + HTML template + SVG icons as base64. Single script tag. |
| **Non-bundle** | `dist/js/winbox.min.js` + `dist/css/winbox.min.css` | Separated JS and CSS. Icons embedded as base64 in CSS. |
| **ES6 Modules** | `src/js/*.js` + `dist/css/winbox.min.css` | For bundlers (Vite, Webpack, etc.). Not minified. |

### 6.3 Build Script Details (`task/build.js`)

The build concatenates `helper.js` + `template.js` + `winbox.js` + `webpack.js`,
strips `import`/`export` statements, renames the template function to
`wbTemplate` (to avoid collision with the `template` cache variable), preserves
the header comment with version, then minifies with `terser`.

### 6.4 Development Workflow

```bash
npm test            # Run Jest tests (jsdom)
npm run server      # Start local HTTP server on port 8080
# Edit LESS in src/css/ → npm run build:css → test in browser
# Edit JS in src/js/   → npm run build:js  → test in browser
```

---

## 7. Component Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Browser / DOM                            │
├─────────────────────────────────────────────────────────────────────┤
│  body                                                               │
│    └─ .winbox#winbox-1.modal.max.focus   ← root element            │
│        ├── .wb-header                   ← title bar                │
│        │   ├── .wb-control              ← button container          │
│        │   │   ├── .wb-min   .wb-max                               │
│        │   │   ├── .wb-full  .wb-close                             │
│        │   └── .wb-drag                 ← draggable area            │
│        │       ├── .wb-icon                                       │
│        │       └── .wb-title                                        │
│        ├── .wb-body                     ← content                   │
│        ├── .wb-n  .wb-s  .wb-e  .wb-w   ← edge resize handles       │
│        └── .wb-nw .wb-ne .wb-se .wb-sw  ← corner resize handles     │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  template.js     │   │  helper.js       │   │  winbox.js       │
│  (DOM factory)   │   │  (DOM utils)     │   │  (core engine)   │
│  cloneNode()     │   │  setStyle()      │   │  constructor()    │
│  cached <div>    │   │  class caching   │   │  prototype.*      │
└────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
         │                      │                      │
         │ clones template      │ sets styles          │ orchestrates
         ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           CSS Layer                                │
├─────────────────────────────────────────────────────────────────────┤
│  winbox.less ──import──► images.less (icon data URIs)              │
│              ──import──► control.less (utility classes)              │
│                                                                     │
│  base.less: --wb-* variables + .wb-theme() mixin             │
│    └─ imported by ──► modern.less, white.less, fluent.less,        │
│                       material.less, dark.less, default.less       │
└─────────────────────────────────────────────────────────────────────┘
```

### Interaction Flow (Drag/Resize)

```
User mousedown on .wb-drag / .wb-n / .wb-se / etc.
  │
  ▼
addWindowListener mousedown handler
  ├─ preventEvent(event, true)        // stop propagation + prevent default
  ├─ self.focus()                      // bring to front
  │
  ├─ (drag only) double-click check    // maximize/restore toggle (300ms)
  │
  ├─ addClass(body, "wb-lock")         // global lock flag
  ├─ add windowmousemove / windowmouseup listeners (passive, capture)
  │
  └─ capture start x/y from event.pageX/pageY
  │
  ▼
handler_mousemove (fires on every mouse move)
  ├─ compute offsetX/Y from start
  ├─ for drag:    self.x += offsetX; self.y += offsetY
  ├─ for resize:  adjust width/height (and x/y if west/north handle)
  ├─ apply min/max constraints + viewport boundaries
  ├─ if was maximized → self.restore()
  ├─ self.resize() → fires onresize + sets inline width/height
  ├─ self.move()   → fires onmove + sets inline left/top
  └─ update start coords for next delta
  │
  ▼
handler_mouseup
  ├─ removeClass(body, "wb-lock")
  ├─ remove windowmousemove / windowmouseup listeners
  └─ cancel RAF loop (if use_raf)
```

---

## 8. Quick Start: Getting Into the Project

### Prerequisites

- Node.js >= 18
- npm

### Install & Build

```bash
git clone https://github.com/nextapps-de/winbox.git
cd winbox
npm install              # installs devDependencies (less, terser, csso, svgo, babel, jest)
npm run build            # full build: clean → copy → svgo → css → themes → bundle
```

### Development Workflow

```bash
# Option A: Use the built files via local server
npm run server           # starts http-server on :8080
open http://localhost:8080

# Option B: Develop with raw sources
# Edit LESS in src/css/ and compile:
npm run build:css        # lessc src/css/winbox.less src/css/winbox.css

# Edit JS and rebuild:
npm run build:js         # terser minify → dist/js/winbox.min.js
npm run build:bundle     # terser bundle → dist/winbox.bundle.min.js

# Run tests:
npm test                 # Jest + jsdom
npm run test:coverage
```

### Key Files to Know When Contributing

| Task | File(s) to Edit |
|---|---|
| Change window look & feel | `src/css/themes/*.less` (palette), `src/css/base.less` (foundation) |
| Add/modify control classes | `src/css/control.less` |
| Change DOM structure | `src/js/template.js` |
| Modify layout/styling | `src/css/winbox.less` |
| Change drag/resize behavior | `src/js/winbox.js` → `addWindowListener()` |
| Add instance methods | `src/js/winbox.js` (prototype) + `src/js/webpack.js` (@export) |
| Add helper utilities | `src/js/helper.js` + `src/js/webpack.js` |
| Change icon set | `src/img/*.svg` + `src/css/images.less` (variable names) |
| Update icon data URIs | `task/bundle.js` (run `npm run build:css:bundle`) |
| Fix demo page | `demo/index.html` + `demo/style.css` |
| Adjust build behavior | `task/build.js`, `task/bundle.js` |
