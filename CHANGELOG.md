## v0.2.9

-  `setIcon()` (and the `icon` option) now accept an object in addition to a
   plain image url: `{ IconType: "Url" | "Class" | "Html", Source, Id, IconStyle }`.
   A plain string keeps working as shortcut for the type "Url".
-  fix: an `icon` set within the `oncreate` callback is applied now (it was
   ignored before, because the icon was applied before the callback was fired).
-  fix: `close()` removed the last window of the stack when the closed window
   was not registered (index `-1`).
-  fix: `minwidth` / `minheight` are now respected on construction and on
   `resize()` (the internal size state now matches the rendered size).
-  fix: `setUrl()` creates the iframe via DOM instead of markup (no HTML
   injection through the url).
-  fix: `mount(null)`, `addControl()` on a custom template without toolbar and
   `fullscreen()` without fullscreen support do not throw anymore.
-  fix: the demo page code blocks now match the running examples (theme
   selector, custom controls, controls) and the leftover empty `.wb-icon`
   element was removed.
-  update dependencies
-  add optional, variable-driven scrollbar styling via the `wb-scrollbar`
   control class and the `--wb-scrollbar-*` custom properties (Firefox
   `scrollbar-width` / `scrollbar-color` plus WebKit `::-webkit-scrollbar*`).
-  add hide-but-scroll control classes `.no-scrollbar` (both axes),
   `.no-scrollbar-y` (vertical only) and `.no-scrollbar-x` (horizontal only)
   which hide the bar while keeping `overflow: auto` intact. The rules use
   `display: none` plus `width: 0` / `height: 0` (all `!important`) so the hide
   also wins over a themed `::-webkit-scrollbar { width: 12px }` and works on
   legacy Safari (which ignores `display: none` on scrollbar pseudo-elements).
-  new variables: `--wb-scrollbar-size`, `--wb-scrollbar-width`, 
   `--wb-scrollbar-color-thumb`, `--wb-scrollbar-color-track`,
   `--wb-scrollbar-thumb`, `--wb-scrollbar-thumb-hover`, `--wb-scrollbar-thumb-inactive`,
   `--wb-scrollbar-thumb-radius`, `--wb-scrollbar-thumb-border`,
   `--wb-scrollbar-track`, `--wb-scrollbar-corner`

## v0.2.7

- support option "overflow" to allow the window moving outside the viewports border
- add static function `WinBox.stack()` which returns an Array containing every window instance ordered by focus history
- support drag move from maximized state
- automatically focus previous focused window on minimize window

## v0.2.5

- support custom toolbar icon
- support custom toolbar controls
- support custom toolbar height
- support custom window index
- support window autosize
- support new callbacks
- improve drag pointer calculation when outside the viewport
- improve toolbar template
- improve window states
- improve performance

#### Migrations:

- the classname `wb-icon` was renamed to `wb-control`
- instead the new window heading toolbar icon was named as `wb-icon`
