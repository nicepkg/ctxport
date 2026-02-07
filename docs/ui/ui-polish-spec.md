# CtxPort UI Polish Specification

> Design Language: Precision-crafted tool aesthetic. Every element earns its pixel.
>
> Target feel: The satisfying click of a Leica shutter. Arc Browser's floating panels.
> Raycast's command palette. A tool so well-made you want to use it just to feel it work.

---

## Table of Contents

1. [Design Tokens](#1-design-tokens)
2. [Motion System](#2-motion-system)
3. [Color Adaptation Strategy](#3-color-adaptation-strategy)
4. [Copy Button](#4-copy-button)
5. [List Copy Icon](#5-list-copy-icon)
6. [Toast Notification](#6-toast-notification)
7. [Context Menu](#7-context-menu)
8. [Popup Panel](#8-popup-panel)
9. [Batch Bar](#9-batch-bar)
10. [Floating Copy Button](#10-floating-copy-button)
11. [Typography System](#11-typography-system)
12. [Spacing System](#12-spacing-system)
13. [Elevation System](#13-elevation-system)

---

## 1. Design Tokens

### 1.1 Font Stack

```
fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
monoFamily: '"SF Mono", "Fira Code", "Cascadia Code", "JetBrains Mono", Menlo, monospace'
```

Inter is the system-level choice. It has optical sizing, tabular numerals, and reads cleanly at 11-13px. The fallback chain ensures every platform has a native-quality sans-serif. All text in CtxPort uses this single stack.

### 1.2 Duration Tokens

| Token       | Value  | Use Case                                              |
|-------------|--------|------------------------------------------------------|
| `instant`   | 100ms  | Hover color shifts, opacity micro-changes             |
| `fast`      | 150ms  | Button state changes, icon swaps                      |
| `normal`    | 250ms  | Panel open/close, menu appear/disappear               |
| `smooth`    | 350ms  | Toast slide-in, complex transitions                   |
| `emphasis`  | 500ms  | Success celebration, meaningful state change feedback  |

### 1.3 Easing Tokens

| Token            | Value                              | Character                      |
|------------------|------------------------------------|--------------------------------|
| `easeOut`        | `cubic-bezier(0.16, 1, 0.3, 1)`   | Quick start, gentle landing    |
| `easeIn`         | `cubic-bezier(0.55, 0, 1, 0.45)`  | Slow start, fast exit          |
| `easeInOut`      | `cubic-bezier(0.65, 0, 0.35, 1)`  | Symmetric, elegant             |
| `spring`         | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Overshoot and settle (playful) |
| `springSubtle`   | `cubic-bezier(0.22, 1.2, 0.36, 1)` | Gentle overshoot (refined)    |
| `snapOut`        | `cubic-bezier(0, 0.7, 0.3, 1)`    | Fast snap to rest              |

The `spring` curve overshoots by ~56%. Use it for interactive elements that benefit from physicality (button press, toast entry). The `springSubtle` overshoots by ~20%, suitable for hover effects that need life without being distracting.

### 1.4 Semantic Colors

These are the CtxPort-owned colors. They do NOT replace plugin theme colors, they complement them.

```typescript
const COLORS = {
  // Status
  success:       { light: '#059669', dark: '#34d399' },  // Emerald 600 / 400
  successBg:     { light: 'rgba(5, 150, 105, 0.08)', dark: 'rgba(52, 211, 153, 0.10)' },
  successBorder: { light: 'rgba(5, 150, 105, 0.20)', dark: 'rgba(52, 211, 153, 0.20)' },

  error:         { light: '#dc2626', dark: '#f87171' },  // Red 600 / 400
  errorBg:       { light: 'rgba(220, 38, 38, 0.08)', dark: 'rgba(248, 113, 113, 0.10)' },
  errorBorder:   { light: 'rgba(220, 38, 38, 0.20)', dark: 'rgba(248, 113, 113, 0.20)' },

  // Surfaces (popup only, not injected elements)
  surface:       { light: '#ffffff', dark: '#1c1c1e' },
  surfaceElevated: { light: '#f9fafb', dark: '#2c2c2e' },
  surfaceBorder: { light: 'rgba(0, 0, 0, 0.08)', dark: 'rgba(255, 255, 255, 0.10)' },

  // Text (popup only)
  textPrimary:   { light: '#111827', dark: '#f9fafb' },
  textSecondary: { light: '#6b7280', dark: '#9ca3af' },
  textTertiary:  { light: '#9ca3af', dark: '#6b7280' },
} as const;
```

**Rationale**: The previous `#16a34a` (green-600) and `#ea580c` (orange-600) were fine but lacked dark mode consideration. The new palette uses emerald for success (more refined than pure green) and red for error (universally understood). Both have corresponding low-opacity backgrounds for toast surfaces.

---

## 2. Motion System

### 2.1 Core Principles

1. **Motion is information**. Every animation answers: "what just happened?" or "what will happen?"
2. **Duration scales with distance**. Small changes (color, opacity) get `instant`/`fast`. Spatial movements (slide-in, scale) get `normal`/`smooth`.
3. **Enter slow, exit fast**. Elements arrive with `easeOut` (decelerate into rest). Elements leave with `easeIn` (accelerate out of view).
4. **Spring for interaction, ease for ambiance**. Button clicks get `spring`. Background fades get `easeInOut`.

### 2.2 Global CSS Variables (for inline style reference)

```typescript
// These are reference constants, applied via inline styles
const MOTION = {
  // Durations
  instant: '100ms',
  fast: '150ms',
  normal: '250ms',
  smooth: '350ms',
  emphasis: '500ms',

  // Easings
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeIn: 'cubic-bezier(0.55, 0, 1, 0.45)',
  easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  springSubtle: 'cubic-bezier(0.22, 1.2, 0.36, 1)',
  snapOut: 'cubic-bezier(0, 0.7, 0.3, 1)',
} as const;
```

---

## 3. Color Adaptation Strategy

### 3.1 The Problem

CtxPort runs across 6+ platforms. Each has its own color language. A button that feels native on ChatGPT (near-black) looks alien on Claude (warm terracotta). Hardcoded colors break everywhere.

### 3.2 The Solution: `currentColor` + Plugin Theme Overrides

**For injected elements** (copy button, list icon, batch checkbox):

```
color: currentColor
```

This is the single most important rule. The idle-state icon inherits the text color of its container in the host page. It blends automatically.

**For state colors** (success, error, loading), CtxPort uses its own palette because these carry universal semantic meaning that transcends platform branding.

**For owned surfaces** (toast, context menu, popup, batch bar), CtxPort uses its own surface tokens. These float above the host page and must look consistent.

### 3.3 Plugin Theme Integration

Each plugin defines a `ThemeConfig` with `light` and `dark` variants:

```typescript
interface ThemeConfig {
  light: { primary: string; secondary: string; fg: string; secondaryFg: string };
  dark?: { primary: string; secondary: string; fg: string; secondaryFg: string };
}
```

**Where plugin theme is used:**
- Popup panel primary action button background: `theme.light.primary` / `theme.dark.primary`
- Popup panel primary action button text: `theme.light.fg` / `theme.dark.fg`
- Batch bar "Copy All" button background: `theme.light.primary` (fallback `#2563eb`)
- Checkbox checked state: `theme.light.primary` (fallback `#2563eb`)

**Where plugin theme is NOT used:**
- Icon idle color (uses `currentColor`)
- Success/error states (uses CtxPort semantic colors)
- Toast/context menu surfaces (uses CtxPort surface tokens)

### 3.4 Dark Mode Detection

Already implemented via `content.tsx`'s `updateTheme()`. The shadow root host gets a `.dark` class. Components read this to switch palettes.

**Implementation pattern** for components using inline styles:

```typescript
// Detect dark mode inside Shadow DOM
function useIsDark(): boolean {
  // Check closest ancestor for .dark class, or use matchMedia
  return document.documentElement.classList.contains('dark')
    || document.body.classList.contains('dark')
    || window.matchMedia('(prefers-color-scheme: dark)').matches;
}
```

### 3.5 Per-Platform Theme Reference

| Platform  | Light Primary | Dark Primary  | Character              |
|-----------|---------------|---------------|------------------------|
| ChatGPT   | `#0d0d0d`     | `#0d0d0d`     | Near-black, neutral    |
| Claude    | `#c6613f`     | `#c6613f`     | Warm terracotta        |
| Gemini    | `#0842a0`     | `#d3e3fd`     | Google blue            |
| Grok      | `#000000`     | `#ffffff`     | High contrast mono     |
| DeepSeek  | `#4d6bfe`     | `#4d6bfe`     | Electric indigo        |
| GitHub    | `#24292f`     | `#f0f6fc`     | Classic dev gray       |

---

## 4. Copy Button

The hero element. 32x32px container, 18x18px icon. This is the element users will interact with hundreds of times. It must feel alive.

### 4.1 Idle State

```typescript
const idleStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  padding: 0,
  border: 'none',
  borderRadius: 8,          // Was 6. Slightly rounder feels more modern.
  background: 'transparent',
  cursor: 'pointer',
  color: 'currentColor',    // KEY CHANGE: was var(--text-secondary, currentColor)
  opacity: 0.7,             // Slightly muted at rest. Comes alive on hover.
  transition: `opacity ${MOTION.fast} ${MOTION.easeOut}, transform ${MOTION.fast} ${MOTION.easeOut}, color ${MOTION.fast} ${MOTION.easeOut}`,
};
```

**Changes from current:**
- `borderRadius: 6` -> `8` (softer)
- `color` now always `currentColor` in idle (was `var(--text-secondary, currentColor)`)
- Added `opacity: 0.7` for idle state (gives hover room to "light up")
- Transition now includes `transform` for hover/click animations

### 4.2 Hover State

```typescript
const hoverStyle = {
  opacity: 1,                                 // Full opacity = "activated"
  transform: 'scale(1.08)',                   // Subtle scale-up
  background: 'rgba(128, 128, 128, 0.08)',    // Barely-there highlight
};
```

Apply on `onMouseEnter`. Remove on `onMouseLeave`. Transition handled by idle's `transition` property.

The `scale(1.08)` is small enough to be felt, not seen. Combined with the opacity lift from 0.7 to 1.0, the icon "wakes up" under the cursor. The faint background is half a shade -- it catches the eye peripherally but disappears if you look straight at it.

### 4.3 Active (Click) State

```typescript
const activeStyle = {
  transform: 'scale(0.88)',
};
```

Apply on `onMouseDown`. Return to hover state on `onMouseUp` / `onMouseLeave`.

This creates a physical "press-in" effect. The icon compresses from 1.08 to 0.88 (a 20% swing), which reads as a satisfying mechanical click. The spring easing on the transition makes it bounce back naturally.

**Transition override for active:**

```typescript
transition: `transform ${MOTION.instant} ${MOTION.easeIn}`
```

The press-in is instant (100ms). The bounce-back uses the idle transition's `spring` timing.

### 4.4 Loading State

**Replace the sun wheel spinner with a modern rotating arc.**

New SVG (18x18, viewBox 0 0 24 24):

```svg
<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
  <circle
    cx="12" cy="12" r="9"
    stroke="currentColor"
    strokeWidth="2"
    strokeOpacity="0.2"
  />
  <path
    d="M12 3a9 9 0 0 1 9 9"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <animateTransform
      attributeName="transform"
      type="rotate"
      from="0 12 12"
      to="360 12 12"
      dur="0.8s"
      repeatCount="indefinite"
    />
  </path>
</svg>
```

**Design rationale:**
- A faint full circle (opacity 0.2) as track, with a quarter-arc sweeping around it
- The arc has `strokeLinecap="round"` for a polished edge
- Duration 0.8s (slightly faster than current 1s) feels more responsive
- Uses `currentColor` so spinner adapts to context
- `opacity: 0.6` on the button + `cursor: wait` remain unchanged

### 4.5 Success State

The checkmark deserves a celebration. Not fireworks -- a precise, confident affirmation.

**Color:** `#059669` (light) / `#34d399` (dark) -- replaces `#16a34a`

**Entry animation (CSS keyframes via inline style workaround):**

Since we use inline styles, the animation is achieved via a two-frame state approach:

1. When state transitions to `success`, render the checkmark SVG with initial style:
```typescript
{
  transform: 'scale(0.5)',
  opacity: 0,
}
```

2. In a `requestAnimationFrame` callback, apply:
```typescript
{
  transform: 'scale(1)',
  opacity: 1,
  transition: `transform ${MOTION.normal} ${MOTION.spring}, opacity ${MOTION.fast} ${MOTION.easeOut}`,
}
```

The checkmark pops in from half-size with spring overshoot (it briefly grows to ~1.12x, then settles to 1.0). Combined with the color shift to emerald, the entire button "lights up green for a breath, then gently returns."

**Auto-return to idle:** After 1500ms, reverse with:
```typescript
{
  transform: 'scale(0.8)',
  opacity: 0,
  transition: `all ${MOTION.fast} ${MOTION.easeIn}`,
}
```

Then swap back to the clipboard icon in idle state.

### 4.6 Error State

**Color:** `#dc2626` (light) / `#f87171` (dark) -- replaces `#ea580c`

Red is universally "something went wrong." Orange was ambiguous (warning vs. error).

**Entry animation:** Same scale-in as success but without the spring (use `easeOut` instead). Errors should feel direct, not playful.

```typescript
{
  transform: 'scale(1)',
  opacity: 1,
  transition: `transform ${MOTION.fast} ${MOTION.easeOut}, opacity ${MOTION.fast} ${MOTION.easeOut}`,
}
```

**Shake micro-animation (optional enhancement):**

On error, add a quick horizontal shake to the button via a sequence of transform updates:

```
Frame 0: translateX(0)
Frame 1 (50ms): translateX(-3px)
Frame 2 (100ms): translateX(3px)
Frame 3 (150ms): translateX(-2px)
Frame 4 (200ms): translateX(0)
```

This can be implemented with `requestAnimationFrame` timing or a simple `@keyframes` injected into the shadow DOM stylesheet.

### 4.7 Icon Refinements

The clipboard icon itself is good. One micro-refinement:

```svg
<!-- Idle: clipboard/copy icon (unchanged, just ensuring strokeLinecap/Join) -->
<svg width="18" height="18" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" strokeWidth="2"
     strokeLinecap="round" strokeLinejoin="round">
  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
</svg>
```

Ensure all icons use `strokeLinecap="round"` and `strokeLinejoin="round"` consistently. This gives line endings a softer, more refined look (vs. square/butt caps).

---

## 5. List Copy Icon

28x28px container, 16x16 icon. Lives in the sidebar conversation list. Must be unobtrusive when idle, instantly accessible when needed.

### 5.1 Appear/Disappear Animation

**Current:** `opacity: 0` -> `opacity: 1` on parent hover. Transition `opacity 150ms ease`.

**New:** Combine opacity with scale and translate for a more "materialized" feel:

```typescript
// Hidden (default)
const hiddenStyle = {
  opacity: 0,
  transform: 'translateY(-50%) scale(0.85)',  // Keep Y centering from injector
  transition: `opacity ${MOTION.fast} ${MOTION.easeIn}, transform ${MOTION.fast} ${MOTION.easeIn}`,
  pointerEvents: 'none' as const,
};

// Visible (on parent hover)
const visibleStyle = {
  opacity: 1,
  transform: 'translateY(-50%) scale(1)',
  transition: `opacity ${MOTION.fast} ${MOTION.easeOut}, transform ${MOTION.fast} ${MOTION.springSubtle}`,
  pointerEvents: 'auto' as const,
};
```

The icon now "grows in" slightly (from 85% to 100%) with a subtle spring, and "shrinks away" when the cursor leaves. The asymmetric easing (springSubtle on enter, easeIn on exit) creates a "appearing is welcoming, disappearing is discreet" dynamic.

**Implementation note:** The injector in `chat-injector.ts` currently sets `opacity` directly. The container's transition should be updated to `opacity 150ms cubic-bezier(0.22, 1.2, 0.36, 1), transform 150ms cubic-bezier(0.22, 1.2, 0.36, 1)` and mouseenter/mouseleave handlers should also set the `transform` property.

### 5.2 Hover & Click

Same micro-interactions as the Copy Button, scaled down:

```typescript
// Hover on the icon itself (within the already-visible state)
const iconHoverStyle = {
  background: 'rgba(128, 128, 128, 0.08)',
  transform: 'translateY(-50%) scale(1.06)',
};

// Active (click)
const iconActiveStyle = {
  transform: 'translateY(-50%) scale(0.9)',
};
```

### 5.3 States

Same state colors and icon swaps as Copy Button, using the 16x16 variants already defined. The spinner and checkmark animations apply identically.

---

## 6. Toast Notification

**Complete redesign.** The toast becomes a full-width top banner -- premium, confident, impossible to miss.

### 6.1 Position & Layout

```typescript
const toastContainerStyle = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  width: '100%',
  zIndex: 99999,
  pointerEvents: 'none' as const,
  display: 'flex',
  justifyContent: 'center',
  padding: '0 16px',
};
```

The outer container is full-width but the inner toast is auto-width, centered:

```typescript
const toastInnerStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 20px',
  marginTop: 12,                               // Small gap from top edge
  borderRadius: 12,
  pointerEvents: 'auto' as const,
  fontFamily: FONT_STACK,
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.4,
  maxWidth: 480,
  // Glass morphism
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
};
```

### 6.2 Success Toast

```typescript
const successToastStyle = {
  ...toastInnerStyle,
  backgroundColor: 'rgba(5, 150, 105, 0.12)',    // Emerald with low opacity
  border: '1px solid rgba(5, 150, 105, 0.20)',
  color: '#059669',                                // Emerald 600
};

// Dark mode
const successToastStyleDark = {
  ...toastInnerStyle,
  backgroundColor: 'rgba(52, 211, 153, 0.12)',
  border: '1px solid rgba(52, 211, 153, 0.20)',
  color: '#34d399',                                // Emerald 400
};
```

**Success icon** (inline SVG, 16x16):

```svg
<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
  <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
</svg>
```

A circled checkmark reads as "confirmed" rather than just "done."

### 6.3 Error Toast

```typescript
const errorToastStyle = {
  ...toastInnerStyle,
  backgroundColor: 'rgba(220, 38, 38, 0.10)',
  border: '1px solid rgba(220, 38, 38, 0.20)',
  color: '#dc2626',
};

// Dark mode
const errorToastStyleDark = {
  ...toastInnerStyle,
  backgroundColor: 'rgba(248, 113, 113, 0.10)',
  border: '1px solid rgba(248, 113, 113, 0.20)',
  color: '#f87171',
};
```

**Error icon** (inline SVG, 16x16):

```svg
<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
  <line x1="12" y1="8" x2="12" y2="13" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" />
  <circle cx="12" cy="16.5" r="0.5" fill="currentColor" stroke="currentColor"
          strokeWidth="1" />
</svg>
```

A circled exclamation -- less aggressive than the triangle warning. Both icons share the circle motif for visual consistency.

### 6.4 Entry Animation

```typescript
// Initial (before mount)
const toastEntryStart = {
  opacity: 0,
  transform: 'translateY(-100%)',
};

// After requestAnimationFrame
const toastEntryEnd = {
  opacity: 1,
  transform: 'translateY(0)',
  transition: `opacity ${MOTION.normal} ${MOTION.easeOut}, transform ${MOTION.smooth} ${MOTION.spring}`,
};
```

The toast slides down from above the viewport with spring easing. The slight overshoot (it dips ~8px below target, then settles) creates a sense of physical weight -- the notification "lands."

### 6.5 Exit Animation

```typescript
const toastExit = {
  opacity: 0,
  transform: 'translateY(-20px)',
  transition: `opacity ${MOTION.fast} ${MOTION.easeIn}, transform ${MOTION.normal} ${MOTION.easeIn}`,
};
```

Exit is faster than entry (normal vs. smooth) and uses `easeIn` to accelerate out. The toast lifts up slightly as it fades, which reads as "dismissed" rather than "disappeared."

### 6.6 Timing

- **Success toast:** Display for 2000ms (was 1500ms, slightly more comfortable reading time)
- **Error toast:** Display for 4000ms (was 3000ms, errors need more reading time)
- After display duration, trigger exit animation (250ms), then unmount

### 6.7 Message Format

**Success:** `[icon] Copied 12 messages -- ~4.2K tokens`

The message stays compact. No "successfully" prefix (redundant with the green color and checkmark icon). The token count gives users useful context without asking.

**Error:** `[icon] Copy failed: [reason]`

Keep error messages direct. The icon + color already communicate severity.

---

## 7. Context Menu

The format selector on right-click. Currently functional, needs elevation refinement.

### 7.1 Container

```typescript
const menuStyle = {
  position: 'fixed' as const,
  zIndex: 100001,
  minWidth: 200,
  padding: '4px 0',
  borderRadius: 12,                             // Was 8. More rounded = more modern.
  backgroundColor: 'rgba(255, 255, 255, 0.88)', // Semi-transparent
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(0, 0, 0, 0.06)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
  fontFamily: FONT_STACK,
  fontSize: 13,
  overflow: 'hidden',
};

// Dark mode
const menuStyleDark = {
  ...menuStyle,
  backgroundColor: 'rgba(44, 44, 46, 0.88)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.30), 0 2px 8px rgba(0, 0, 0, 0.20)',
};
```

**Glass morphism** gives the menu depth without looking like a flat card dropped onto the page. The blur lets the underlying content subtly show through, grounding the menu in its spatial context.

### 7.2 Entry Animation

The menu should materialize, not just appear.

```typescript
// Initial
const menuEntryStart = {
  opacity: 0,
  transform: 'scale(0.95) translateY(-4px)',
};

// After rAF
const menuEntryEnd = {
  opacity: 1,
  transform: 'scale(1) translateY(0)',
  transition: `opacity ${MOTION.fast} ${MOTION.easeOut}, transform ${MOTION.normal} ${MOTION.springSubtle}`,
};
```

The menu scales up from 95% with a gentle spring. It feels like the menu "grows out" from the click point.

### 7.3 Menu Items

```typescript
const menuItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '8px 14px',
  textAlign: 'left' as const,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-primary, #1f2937)',
  fontSize: 13,
  lineHeight: 1.4,
  transition: `background-color ${MOTION.instant} ${MOTION.easeOut}`,
  borderRadius: 0,           // Items fill the menu edge-to-edge
};

// Hover
const menuItemHoverStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0.04)',  // Light mode
};
const menuItemHoverStyleDark = {
  backgroundColor: 'rgba(255, 255, 255, 0.06)',
};
```

**Remove the checkmark prefix** (`"✓ Copy full conversation"`). Instead, use a small icon per format option:

| Format         | Icon description          | Mnemonic               |
|----------------|---------------------------|------------------------|
| Full           | Two overlapping docs      | "Everything"           |
| User only      | Single person silhouette  | "Just your messages"   |
| Code only      | Code brackets `<>`        | "Code blocks"          |
| Compact        | Compressed lines          | "Condensed"            |

Each icon is 14x14, `currentColor`, placed in the `gap` before the label. This gives the menu a more polished, scannable feel.

### 7.4 Active Item Indicator

The currently-selected format (default: "full") gets a subtle accent dot or a slightly bolder font weight:

```typescript
const activeItemStyle = {
  fontWeight: 600,
  color: 'var(--primary, #2563eb)',
};
```

This replaces the crude `"✓ "` text prefix with proper typographic emphasis.

---

## 8. Popup Panel

The popup is the brand surface. It must feel like opening a premium tool's dashboard.

### 8.1 Container

```typescript
const popupContainerStyle = {
  width: 280,                                    // Was 240. A touch wider for breathing room.
  padding: '20px',
  fontFamily: FONT_STACK,
  backgroundColor: '#ffffff',
  color: '#111827',
};

// Dark mode (detect via prefers-color-scheme since popup runs outside shadow DOM)
const popupContainerStyleDark = {
  ...popupContainerStyle,
  backgroundColor: '#1c1c1e',
  color: '#f9fafb',
};
```

### 8.2 Header

```typescript
const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 4,
};

const logoStyle = {
  width: 20,
  height: 20,
  // Use the extension icon, or a small SVG mark
};

const titleStyle = {
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: '-0.01em',                     // Tighten slightly for heading feel
  color: 'inherit',
};

const subtitleStyle = {
  fontSize: 12,
  color: '#6b7280',                              // Gray-500
  lineHeight: 1.5,
  marginBottom: 20,
};
```

**Layout:**
```
[Logo] CtxPort
Copy AI conversations as Context Bundles.
```

The logo + title sit on one line. Subtitle underneath. Clean hierarchy.

### 8.3 Action Buttons

Two buttons, stacked vertically, with proper hierarchy:

**Primary button (Copy Current Conversation):**

```typescript
const primaryButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: 'none',
  backgroundColor: '#2563eb',                    // Fallback; use plugin primary if available
  color: '#ffffff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'left' as const,
  transition: `background-color ${MOTION.fast} ${MOTION.easeOut}, transform ${MOTION.fast} ${MOTION.spring}`,
};

// Hover
const primaryButtonHover = {
  backgroundColor: '#1d4ed8',                    // Slightly darker
};

// Active
const primaryButtonActive = {
  transform: 'scale(0.97)',                      // Gentle press-in
};
```

**Secondary button (Batch Selection Mode):**

```typescript
const secondaryButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid rgba(0, 0, 0, 0.10)',
  backgroundColor: 'transparent',
  color: '#374151',                              // Gray-700
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  textAlign: 'left' as const,
  transition: `background-color ${MOTION.fast} ${MOTION.easeOut}, border-color ${MOTION.fast} ${MOTION.easeOut}, transform ${MOTION.fast} ${MOTION.spring}`,
};

// Hover
const secondaryButtonHover = {
  backgroundColor: 'rgba(0, 0, 0, 0.03)',
  borderColor: 'rgba(0, 0, 0, 0.15)',
};

// Active
const secondaryButtonActive = {
  transform: 'scale(0.97)',
};

// Dark mode
const secondaryButtonStyleDark = {
  ...secondaryButtonStyle,
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: '#d1d5db',
};
```

**Button icons:** Add small leading icons (16x16) inside each button:

- Copy Current: clipboard icon (same as copy button idle icon)
- Batch Mode: grid/checklist icon

### 8.4 Keyboard Shortcuts Footer

```typescript
const footerStyle = {
  marginTop: 20,
  paddingTop: 14,
  borderTop: '1px solid rgba(0, 0, 0, 0.06)',
};

const shortcutRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 11,
  color: '#9ca3af',                              // Gray-400
  lineHeight: 2,
};

const kbdStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  fontSize: 10,
  fontFamily: FONT_STACK,
  fontWeight: 500,
  color: '#6b7280',
  backgroundColor: 'rgba(0, 0, 0, 0.04)',
  padding: '2px 5px',
  borderRadius: 4,
  border: '1px solid rgba(0, 0, 0, 0.06)',
};
```

**Layout:**
```
Copy current          [Cmd] [Shift] [C]
Batch mode            [Cmd] [Shift] [E]
```

Each key in its own `<kbd>` element with the styled background. This looks professional and is immediately scannable.

### 8.5 Dark Mode Variants

```typescript
const footerStyleDark = {
  ...footerStyle,
  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
};

const kbdStyleDark = {
  ...kbdStyle,
  color: '#9ca3af',
  backgroundColor: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
};
```

---

## 9. Batch Bar

The batch mode toolbar. Sticky at top of sidebar. Functional, but needs refinement to match the new design language.

### 9.1 Container

```typescript
const batchBarStyle = {
  position: 'sticky' as const,
  top: 0,
  zIndex: 50,
  padding: '10px 14px',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  backdropFilter: 'blur(12px) saturate(150%)',
  WebkitBackdropFilter: 'blur(12px) saturate(150%)',
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
  fontFamily: FONT_STACK,
  fontSize: 13,
  color: 'var(--text-primary, #374151)',
};

const batchBarStyleDark = {
  ...batchBarStyle,
  backgroundColor: 'rgba(28, 28, 30, 0.85)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'var(--text-primary, #d1d5db)',
};
```

**Glass morphism** here too. The bar floats above the scrolling list with blur, making it feel like a toolbar rather than a plain div.

### 9.2 Selection Counter

```typescript
const counterStyle = {
  fontSize: 13,
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',  // Numbers don't shift layout when count changes
};
```

**Format:** `3 selected` (not `3 Selected` -- sentence case is more natural).

### 9.3 Copy All Button

```typescript
const copyAllButtonStyle = {
  padding: '5px 14px',
  borderRadius: 8,
  border: 'none',
  backgroundColor: 'var(--primary, #2563eb)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  transition: `background-color ${MOTION.fast} ${MOTION.easeOut}, transform ${MOTION.fast} ${MOTION.spring}, opacity ${MOTION.fast} ${MOTION.easeOut}`,
};

const copyAllButtonDisabledStyle = {
  ...copyAllButtonStyle,
  backgroundColor: 'rgba(0, 0, 0, 0.06)',
  color: 'rgba(0, 0, 0, 0.25)',
  cursor: 'default',
};
```

### 9.4 Cancel Button

```typescript
const cancelButtonStyle = {
  padding: '5px 14px',
  borderRadius: 8,
  border: '1px solid rgba(0, 0, 0, 0.10)',
  background: 'transparent',
  color: 'var(--text-secondary, #6b7280)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  transition: `background-color ${MOTION.fast} ${MOTION.easeOut}, border-color ${MOTION.fast} ${MOTION.easeOut}`,
};
```

### 9.5 Progress State

During copying, replace the counter with a progress indicator:

```
Copying... 3/7
```

Use `fontVariantNumeric: 'tabular-nums'` so the numbers don't cause layout shift as they increment. Optionally add a thin progress bar under the batch bar:

```typescript
const progressBarStyle = {
  position: 'absolute' as const,
  bottom: 0,
  left: 0,
  height: 2,
  backgroundColor: 'var(--primary, #2563eb)',
  transition: `width ${MOTION.normal} ${MOTION.easeOut}`,
  borderRadius: 1,
};
// width = `${(progress.current / progress.total) * 100}%`
```

### 9.6 Success/Fail State Colors

Success background:
```typescript
backgroundColor: 'rgba(5, 150, 105, 0.06)'  // Very subtle green tint
```

Partial-fail background:
```typescript
backgroundColor: 'rgba(220, 38, 38, 0.06)'  // Very subtle red tint
```

---

## 10. Floating Copy Button

The fallback when no injector is available. Fixed bottom-right.

### 10.1 Container

```typescript
const floatingContainerStyle = {
  position: 'fixed' as const,
  bottom: 20,
  right: 20,
  zIndex: 99999,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  borderRadius: 14,
  padding: '6px 6px 6px 14px',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.10), 0 1px 4px rgba(0, 0, 0, 0.05)',
  border: '1px solid rgba(0, 0, 0, 0.06)',
  transition: `transform ${MOTION.normal} ${MOTION.springSubtle}, box-shadow ${MOTION.normal} ${MOTION.easeOut}`,
};

const floatingContainerStyleDark = {
  ...floatingContainerStyle,
  backgroundColor: 'rgba(28, 28, 30, 0.85)',
  border: '1px solid rgba(255, 255, 255, 0.10)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25), 0 1px 4px rgba(0, 0, 0, 0.15)',
};
```

### 10.2 Label

```typescript
const floatingLabelStyle = {
  fontSize: 11,
  fontWeight: 600,
  fontFamily: FONT_STACK,
  letterSpacing: '0.02em',
  color: 'rgba(0, 0, 0, 0.45)',
  userSelect: 'none' as const,
  textTransform: 'uppercase' as const,
};
```

**Text:** `CTXPORT` in uppercase with slight letter-spacing. Small, discreet, branded.

### 10.3 Hover

On container hover:
```typescript
{
  transform: 'scale(1.02)',
  boxShadow: '0 6px 24px rgba(0, 0, 0, 0.14), 0 2px 6px rgba(0, 0, 0, 0.06)',
}
```

The entire pill lifts slightly on hover. The copy button inside still has its own hover state.

---

## 11. Typography System

All sizes are in `px` for shadow DOM isolation (rem would inherit host page root font size).

| Token        | Size | Weight | Line Height | Letter Spacing | Use Case                       |
|--------------|------|--------|-------------|----------------|--------------------------------|
| `heading`    | 15px | 700    | 1.3         | -0.01em        | Popup title                    |
| `body`       | 13px | 400    | 1.5         | 0              | Primary text, menu items       |
| `bodyStrong` | 13px | 600    | 1.5         | 0              | Button labels, counters        |
| `caption`    | 12px | 400    | 1.5         | 0              | Descriptions, secondary info   |
| `small`      | 11px | 500    | 1.6         | 0              | Keyboard shortcuts, metadata   |
| `tiny`       | 10px | 500    | 1.4         | 0.02em         | Kbd elements, badges           |

**Note:** Use `px` units consistently. Do not use `rem` or `em` inside shadow DOM components.

---

## 12. Spacing System

Base unit: 4px. All spacing is a multiple.

| Token  | Value | Use Case                                    |
|--------|-------|---------------------------------------------|
| `xs`   | 4px   | Tight gaps (icon to text within a label)     |
| `sm`   | 6px   | Related element gaps (buttons in a row)      |
| `md`   | 8px   | Standard gap (form fields, list items)       |
| `lg`   | 12px  | Section separator                            |
| `xl`   | 16px  | Major section padding                        |
| `2xl`  | 20px  | Container padding (popup, panels)            |
| `3xl`  | 24px  | Page-level margins                           |

---

## 13. Elevation System

Elevation is expressed via `box-shadow` and `backdrop-filter`. Higher elevation = more shadow spread + optional blur.

| Level | Name          | box-shadow                                                       | backdrop-filter              | Use Case            |
|-------|---------------|------------------------------------------------------------------|------------------------------|---------------------|
| 0     | `flat`        | none                                                             | none                         | Inline elements     |
| 1     | `raised`      | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`       | none                         | Buttons on surface  |
| 2     | `floating`    | `0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.05)`      | `blur(12px) saturate(150%)`  | Floating button     |
| 3     | `overlay`     | `0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)`      | `blur(20px) saturate(180%)`  | Context menu, toast |
| 4     | `modal`       | `0 16px 48px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08)`    | `blur(24px) saturate(200%)`  | Modal dialogs       |

**Dark mode:** Multiply shadow opacity by 2x. Dark backgrounds absorb light, so shadows need more intensity to be perceivable.

---

## Implementation Notes

### Inline Style Approach

All components use React `style` prop (no CSS classes, no external stylesheets). This is a hard constraint from the shadow DOM architecture. Therefore:

1. **No CSS keyframes** can be defined directly. Use `requestAnimationFrame` timing or inject a `<style>` tag into the shadow DOM root for `@keyframes` if needed.
2. **Pseudo-classes** (`:hover`, `:active`) must be handled via `onMouseEnter`/`onMouseLeave`/`onMouseDown`/`onMouseUp` event handlers that toggle state.
3. **Media queries** must use `window.matchMedia()` JavaScript API.

### Animation Implementation Pattern

For two-frame transitions (initial -> animate-in):

```typescript
const [animating, setAnimating] = useState(false);

useEffect(() => {
  // Force a layout read, then start animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setAnimating(true);
    });
  });
}, []);

// Use animating state to toggle between start/end styles
```

Double `requestAnimationFrame` ensures the browser has painted the initial frame before applying the transition target, preventing the browser from batching both states into a single frame.

### Performance Considerations

1. **`will-change` sparingly.** Only add `will-change: transform` to elements that actively animate. Remove it after animation completes (via `onTransitionEnd`).
2. **`backdrop-filter` cost.** Glass morphism is GPU-intensive. Use it only on elements that are small (toast, menu, floating button) and appear briefly. Never on full-page overlays.
3. **`transform` over layout properties.** Always animate `transform` and `opacity`. Never animate `width`, `height`, `top`, `left`, `padding`, or `margin` -- these trigger layout recalculation.

---

## Summary of Key Changes from Current Implementation

| Component         | Before                          | After                                             |
|-------------------|---------------------------------|---------------------------------------------------|
| Copy Button color | `var(--text-secondary)`         | `currentColor` with `opacity: 0.7`                |
| Copy Button hover | None                            | `scale(1.08)` + opacity 1.0 + subtle bg           |
| Copy Button click | None                            | `scale(0.88)` spring bounce                        |
| Success color     | `#16a34a`                       | `#059669` / `#34d399`                              |
| Error color       | `#ea580c`                       | `#dc2626` / `#f87171`                              |
| Spinner           | Sun wheel SVG, 1s               | Quarter-arc on track, 0.8s                         |
| Success anim      | Instant swap                    | scale(0.5->1.0) spring + fade                      |
| Toast position    | Fixed bottom-right              | Fixed top-center, full-width container              |
| Toast style       | Colored semi-transparent bg     | Glass morphism, emerald/red tint, border, icon      |
| Toast entry       | fade + translateY(8px)          | translateY(-100%) spring slide-down                 |
| Toast duration    | 1500ms / 3000ms                 | 2000ms / 4000ms                                    |
| List Icon appear  | opacity only                    | opacity + scale(0.85->1.0) spring                   |
| Context Menu      | Plain white, basic shadow       | Glass morphism, scale-in animation, icons per item   |
| Popup width       | 240px                           | 280px                                               |
| Popup buttons     | Basic filled/outline            | Rounded, icon-led, press-in micro-interaction        |
| Popup shortcuts   | Plain text                      | Styled `<kbd>` elements                              |
| Border radius     | 6px (buttons), 8px (menus)      | 8px (buttons), 12px (menus/toast)                    |
| Font stack        | System font stack               | Inter-first with system fallback                     |
| Batch bar bg      | Opaque                          | Glass morphism blur                                  |
| Floating button   | Dark bg, basic shadow           | Glass morphism, uppercase label, lift on hover       |
| Transition easing | `ease` everywhere               | Context-appropriate tokens (spring, easeOut, etc.)   |
