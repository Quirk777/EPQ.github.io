# EPQ Design System
**Deep-Tech Visual Language**

## Design Manifesto

We are building software for high-stakes decisions. Our users handle sensitive talent data and make critical hiring choices. The interface must feel **engineered, not marketed**. 

Think: clean room, operating theater, aerospace control center—not startup demo day.

**Core Principles:**
- **Restraint over excitement** — Every element earns its place
- **Depth through layering** — Atmosphere comes from subtle material stacking
- **Information clarity** — Data is sacred; decoration is minimal
- **Passive futurism** — Advanced feel through spacing and precision, not effects
- **Trust through calm** — Professional confidence, never hype

---

## 1. Color System

### Base Neutrals (Foundation)
```
Background Layers:
--surface-0:     #0B0C0F    (Deep base, near-black)
--surface-1:     #12131A    (Elevated panels)
--surface-2:     #1A1B25    (Cards, modals)
--surface-3:     #22232F    (Interactive elements)

Text:
--text-primary:   #E8E9ED   (Main content, 95% opacity)
--text-secondary: #A5A7B2   (Supporting text)
--text-tertiary:  #6B6D7C   (Placeholders, hints)

Borders:
--border-subtle:  #23242F   (Almost invisible dividers)
--border-default: #2C2D3A   (Standard separators)
--border-strong:  #3A3B4A   (Emphasized boundaries)
```

### Pastel Accents (Atmospheric)
These are **never dominant**—used sparingly for hierarchy and state.

```
Primary (Cognitive/Data):
--accent-blue:      #B4C7E7   (Pastel periwinkle)
--accent-blue-dim:  #7A8BA5   (Muted state)
--accent-blue-glow: rgba(180, 199, 231, 0.08)  (Subtle background wash)

Secondary (Process/Action):
--accent-mint:      #C4E7D4   (Soft seafoam)
--accent-mint-dim:  #8BA599
--accent-mint-glow: rgba(196, 231, 212, 0.06)

Tertiary (Insight/Intelligence):
--accent-lavender:  #D4D0E7   (Whisper purple)
--accent-lavender-dim: #9A96B2
--accent-lavender-glow: rgba(212, 208, 231, 0.06)

Quarternary (Warmth/Human):
--accent-peach:     #E7D7C4   (Soft terra)
--accent-peach-dim: #B2A899
--accent-peach-glow: rgba(231, 215, 196, 0.05)
```

**Usage Rules:**
- Pastels appear as **thin accents** (1-2px borders, subtle backgrounds)
- Never use as large color blocks
- Maximum 2 accent colors per screen
- Text on pastels requires dimmed variants (#7A8BA5, never #B4C7E7 on dark)

### Semantic Colors (Functional)
```
Success:  #85B69C  (Desaturated jade)
Warning:  #C4B089  (Muted amber)
Error:    #C48989  (Soft terracotta)
Info:     #89A3C4  (Faded azure)
```

---

## 2. Typography

### Font Stack
```css
Primary (Data/UI):
font-family: 'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

Secondary (Headings):
font-family: 'Geist', 'Inter Variable', system-ui, sans-serif;

Monospace (Codes/IDs):
font-family: 'Geist Mono', 'JetBrains Mono', 'SF Mono', monospace;
```

**If custom fonts unavailable**, use system defaults with these weights:
```
Headings:  font-weight: 600  (Semibold, not black)
Body:      font-weight: 400  (Regular)
Labels:    font-weight: 500  (Medium)
Captions:  font-weight: 400  (Regular, smaller size)
```

### Type Scale
```
--text-xs:   11px / 16px  (letter-spacing: 0.02em)   [Captions, metadata]
--text-sm:   13px / 20px  (letter-spacing: 0.01em)   [Secondary text, labels]
--text-base: 15px / 24px  (letter-spacing: 0)        [Body, primary content]
--text-lg:   17px / 28px  (letter-spacing: -0.01em)  [Subheadings]
--text-xl:   20px / 32px  (letter-spacing: -0.02em)  [Section titles]
--text-2xl:  28px / 36px  (letter-spacing: -0.03em)  [Page titles]
--text-3xl:  36px / 44px  (letter-spacing: -0.04em)  [Hero headings - RARE]
```

**Typography Rules:**
- Headings never exceed 600 weight (no "black" or 900)
- Line-height increases with font size
- Negative letter-spacing for headings (tighter = more technical)
- Max line length: 65 characters for readability
- Paragraph spacing: 1.5em minimum

---

## 3. Surface Design

### Card/Panel Structure
```
Standard Panel:
- Background: var(--surface-2)
- Border: 1px solid var(--border-subtle)
- Border-radius: 8px (never more than 12px)
- Padding: 20px (24px for important panels)
- Box-shadow: NONE (use borders and background layers instead)

Elevated Panel (modals, popovers):
- Background: var(--surface-3)
- Border: 1px solid var(--border-default)
- Border-radius: 10px
- Backdrop-filter: blur(20px) (only for floating panels)
- Box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) (subtle depth, not glow)

Nested Content (inside panels):
- Background: var(--surface-1)
- Border: 1px solid var(--border-subtle)
- Border-radius: 6px
- Padding: 16px
```

### Depth System
**Elevation is achieved through layering, not drop shadows.**

```
Layer 0 (Page background):     surface-0
Layer 1 (Main containers):     surface-1 + border-subtle
Layer 2 (Cards, panels):       surface-2 + border-default
Layer 3 (Modals, dropdowns):   surface-3 + border-strong + backdrop blur
Layer 4 (Tooltips):            surface-3 + subtle shadow
```

**Shadow Usage** (MINIMAL):
- Only for floating elements (tooltips, dropdowns, modals)
- Format: `0 [y-offset] [blur] rgba(0, 0, 0, [opacity])`
- Max opacity: 0.4
- NO colored shadows
- NO "glow" effects

### Spacing System
```
--space-1:  4px   (Tight grouping)
--space-2:  8px   (Related elements)
--space-3:  12px  (Component padding)
--space-4:  16px  (Standard gap)
--space-5:  20px  (Panel padding)
--space-6:  24px  (Section padding)
--space-8:  32px  (Major sections)
--space-12: 48px  (Page sections)
--space-16: 64px  (Hero sections)
```

Use multiples of 4px. Never arbitrary values.

---

## 4. Interaction & Motion

### Hover States
```css
/* Buttons/Links */
transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);

Hover changes:
- Background: Lighten by 1 surface level (surface-1 → surface-2)
- Border: border-subtle → border-default
- Text: text-secondary → text-primary
- Transform: NONE (no scale, no translateY)

Exception: Critical actions can have subtle background color shift
  background: var(--surface-2) → rgba(180, 199, 231, 0.08)
```

### Focus States
```css
/* Keyboard navigation */
outline: 2px solid var(--accent-blue-dim);
outline-offset: 2px;
border-radius: inherit;
```

Never remove outlines. Accessibility is non-negotiable.

### Loading States
```
Skeleton Loaders:
- Background: linear-gradient(90deg, 
    var(--surface-2) 0%, 
    var(--surface-3) 50%, 
    var(--surface-2) 100%)
- Animation: 1.5s ease-in-out infinite
- Height matches expected content
- Border-radius matches final element
```

**No spinners**. Use linear progress bars or skeleton content.

### Transitions
```
Property        Duration    Easing
--------        --------    ------
color           150ms       ease
background      180ms       cubic-bezier(0.4, 0, 0.2, 1)
border          180ms       cubic-bezier(0.4, 0, 0.2, 1)
opacity         200ms       ease-out
transform       240ms       cubic-bezier(0.4, 0, 0.2, 1)

Page transitions: NONE (instant navigation)
```

**Motion Rules:**
- Animation only clarifies state changes
- No auto-playing animations
- No parallax scrolling
- No "floating" elements
- Prefer subtle opacity/position shifts over scale/rotation

---

## 5. AI Imagery & Media

### What's Acceptable
✅ **Technical diagrams** (wireframe style, monochrome)
✅ **Data visualizations** (charts, graphs in pastel accent colors)
✅ **Abstract geometry** (Voronoi diagrams, network graphs)
✅ **Texture overlays** (subtle noise, grain at 2-5% opacity)
✅ **Real product screenshots** (with privacy blur on sensitive data)

### Style Guidelines
- **Monochrome preferred**: Grayscale or single pastel tint
- **Line weight**: 1px, consistent throughout
- **No photography** of people (use abstract representations)
- **No stock imagery** (tech hands on keyboard, diverse team photos)
- **No AI-generated faces** (uncanny valley problem)

### Where Imagery Belongs
✅ Dashboard backgrounds (subtle, low-opacity geometric patterns)
✅ Empty states (simple line illustrations, never playful)
✅ Data visualization (charts only, no decorative graphs)
✅ Documentation (technical diagrams)

### Where Imagery Must NEVER Appear
❌ Hero sections (text and data only)
❌ Navigation (icons acceptable, no logos/illustrations)
❌ Forms (clean, text-based)
❌ Cards/panels (content only)
❌ Buttons (text or simple icon)
❌ Marketing fluff (no "AI brain" graphics, neural networks, robots)

---

## 6. What to Remove (De-cornification Checklist)

### Immediate Removals
```diff
- ❌ Gradient orbs floating in background
- ❌ Particle animations (dots flying around)
- ❌ Emoji icons (🎯 📋 📅) → Replace with simple line icons or text
- ❌ "Glassmorphism" cards with blur/transparency
- ❌ Glowing borders (`box-shadow: 0 0 20px rgba(99, 102, 241, 0.4)`)
- ❌ Floating animations (`transform: translateY(-20px)`)
- ❌ Pulsing effects
- ❌ Marketing copy ("The Future of HR is Automated!")
- ❌ Exclamation points in UI text
- ❌ Gradient text effects
- ❌ Multiple accent colors on one element
- ❌ Drop shadows everywhere
- ❌ Border-radius > 12px (no pill shapes)
- ❌ font-weight: 900 (black text is for comic books)
```

### Subtle Replacements
```
Old → New
---   ---
"Smart Candidate Screening 🎯" → "Candidate Screening"
font-weight: 900 → font-weight: 600
border-radius: 20px → border-radius: 8px
background: radial-gradient(...) → background: var(--surface-2)
box-shadow: 0 20px 60px ... → border: 1px solid var(--border-default)
backdrop-filter: blur(20px) → (remove, use solid backgrounds)
"Get Started Free" → "Start Trial"
"See How It Works" → "Documentation"
```

---

## 7. Component Examples

### Button
```tsx
// Primary Action
style={{
  padding: "10px 20px",
  fontSize: "15px",
  fontWeight: 500,
  color: "var(--text-primary)",
  background: "var(--accent-blue-glow)",
  border: "1px solid var(--accent-blue-dim)",
  borderRadius: 6,
  transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  cursor: "pointer"
}}

// Hover
background: "rgba(180, 199, 231, 0.12)"
border: "1px solid var(--accent-blue)"

// Secondary
Same but with border-default and no background
```

### Input Field
```tsx
style={{
  width: "100%",
  padding: "10px 14px",
  fontSize: "15px",
  color: "var(--text-primary)",
  background: "var(--surface-1)",
  border: "1px solid var(--border-default)",
  borderRadius: 6,
  transition: "border-color 180ms ease"
}}

// Focus
border: "1px solid var(--accent-blue-dim)"
outline: "2px solid var(--accent-blue-glow)"
```

### Card
```tsx
style={{
  background: "var(--surface-2)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 8,
  padding: 20
}}

// Hover (if interactive)
border: "1px solid var(--border-default)"
```

### Stat Display
```tsx
<div style={{ display: "flex", gap: 24 }}>
  <div>
    <div style={{ 
      fontSize: 28, 
      fontWeight: 600, 
      letterSpacing: "-0.03em",
      color: "var(--text-primary)" 
    }}>
      96%
    </div>
    <div style={{ 
      fontSize: 13, 
      color: "var(--text-tertiary)",
      marginTop: 4 
    }}>
      Time reduction
    </div>
  </div>
</div>
```

---

## 8. Implementation Checklist

### Phase 1: Foundation
- [ ] Replace all backgrounds with surface-0/1/2 system
- [ ] Remove all gradients (except subtle text effects if needed)
- [ ] Reduce border-radius to 6-10px maximum
- [ ] Standardize spacing to 4px increments
- [ ] Replace font weights (900 → 600, 800 → 600, 700 → 600)

### Phase 2: Cleanup
- [ ] Remove ParticleBackground component
- [ ] Remove gradient orb divs
- [ ] Remove all box-shadow glow effects
- [ ] Replace emoji icons with text or simple SVG
- [ ] Remove "glassmorphism" backdrop-filter effects

### Phase 3: Typography
- [ ] Apply proper type scale (11/13/15/17/20/28/36px)
- [ ] Add negative letter-spacing to headings
- [ ] Ensure line-heights match system (16/20/24/28/32/36/44px)
- [ ] Remove marketing language (exclamations, hype words)

### Phase 4: Color
- [ ] Apply pastel accents sparingly (borders, subtle backgrounds)
- [ ] Use only 1-2 accent colors per screen
- [ ] Ensure text contrast meets WCAG AA (4.5:1 minimum)
- [ ] Replace bright colors with muted semantic colors

### Phase 5: Interaction
- [ ] Standardize transitions (180ms cubic-bezier)
- [ ] Remove scale/transform effects on hover
- [ ] Add proper focus states (outlines)
- [ ] Test keyboard navigation

### Phase 6: Content
- [ ] Remove decorative imagery
- [ ] Replace stock photos
- [ ] Simplify copy (remove superlatives)
- [ ] Add real data where possible

---

## Final Note

This system creates **trust through restraint**. Every removed gradient, every simplified transition, every reduction in font weight says: "We are confident in our product. We don't need to yell."

The design should feel like an expensive piece of industrial equipment—purposeful, precise, and expensive because of what it can do, not how it looks.

**Design is complete when nothing else can be removed.**
