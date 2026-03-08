# Feature 8: Resizable Panes

| Field | Value |
|---|---|
| Priority | phase2-mid |
| Status | ✅ Complete |
| Depends On | [Feature 2](feature-02-ai-pair-programmer.md) (output-chat divider requires AI chat panel) |

---

## Task Prompt

Replace fixed panel dimensions with draggable resize dividers. Key files: `resizable-divider.directive.ts` (or component), `pane-size.service.ts`, `app.component.html/.scss`. Acceptance: all three dividers drag correctly, sizes persist in localStorage, touch works on tablets, min-size constraints are enforced.

---

## Design

**The problem**: The Quest Master layout uses fixed-size panels. The quest sidebar, code editor, output panel, and AI Pair Programmer chat each have a hard-coded height or width. Players with small screens can't see enough output; players with large screens waste space. Power users want a bigger editor; beginners want a bigger hint/quest pane.

**The solution**: Replace fixed panel dimensions with draggable resize dividers.

---

## Implementation

**Dividers:**

| Divider | Orientation | Separates |
|---|---|---|
| `sidebar-divider` | Vertical | Quest sidebar ↔ main content area |
| `editor-output-divider` | Horizontal | Code editor ↔ Output panel |
| `output-chat-divider` | Horizontal | Output panel ↔ AI Pair Programmer |

**Layout constraints:**

| Divider | Min (smaller side) | Min (larger side) | Notes |
|---|---|---|---|
| `sidebar-divider` | 180px (sidebar) | 400px (content) | Sidebar must stay wide enough to read quest text |
| `editor-output-divider` | 80px (output) | 120px (editor) | Output must always show at least 3 lines; editor at least 4 lines |
| `output-chat-divider` | 60px (chat input row) | 60px (output) | Chat must always show input + at least one message row |

**Persistence**: Each divider position is saved to `localStorage` under the keys `qm.pane.sidebar`, `qm.pane.editorOutput`, and `qm.pane.outputChat` (stored as pixel values). On next load the saved sizes are restored. If a saved value violates the current minimum (e.g. window was resized), clamp to the minimum.

**Drag handle UI**: Each divider renders as a 4px-wide (vertical) or 4px-tall (horizontal) strip. On hover, the strip highlights in `--accent-purple` and the cursor changes to `col-resize` / `row-resize`. A subtle `⋮` / `⋯` glyph centered on the handle provides a visual affordance.

**Implementation approach (Angular):**

1. Create a `ResizableDividerDirective` (or a standalone `ResizableDividerComponent`) that:
   - Listens for `mousedown` on the handle element
   - On drag, calculates the delta from `mousemove` events on `document`
   - Emits a `(sizeChange)` output with the new pixel size of the primary panel
   - Cleans up listeners on `mouseup` / `mouseleave` from `document`
2. Apply the directive to the three divider elements in `AppComponent` (or whichever layout shell hosts the panels).
3. Bind the primary panel's `[style.width]` / `[style.height]` to the service-managed size; the sibling panel uses `flex: 1` to fill remaining space.
4. Store and restore sizes via a lightweight `PaneSizeService` that wraps `localStorage`.

**Touch support**: The drag handle also responds to `touchstart` / `touchmove` / `touchend` so the app is usable on tablets.

**No server changes required.** This is purely a front-end layout feature.

**Files changed:**
- `quest-master/src/app/directives/resizable-divider.directive.ts` — new directive
- `quest-master/src/app/services/pane-size.service.ts` — new service wrapping localStorage
- `quest-master/src/app/app.component.html` — apply directive to three divider elements
- `quest-master/src/app/app.component.scss` — divider strip styles, hover highlight, cursor

---

## Open Questions

- [ ] Should there be a "Reset pane sizes to defaults" button (e.g. in Settings), or is dragging back to a comfortable size sufficient?
- [ ] When the browser window is resized below a stored pane size, should the app clamp silently or display a brief toast/notice?
- [ ] Should the `output-chat-divider` be hidden or disabled when the AI Pair chat panel is in its collapsed state (Feature 2)?
