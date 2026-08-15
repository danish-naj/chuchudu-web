---
name: Kinetic Neo-Brutalist
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#454937'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#757965'
  outline-variant: '#c5c9b1'
  surface-tint: '#506600'
  primary: '#506600'
  on-primary: '#ffffff'
  primary-container: '#a4c639'
  on-primary-container: '#3e5000'
  inverse-primary: '#b1d446'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2e2e2'
  on-secondary-container: '#646464'
  tertiary: '#5d5f5f'
  on-tertiary: '#ffffff'
  tertiary-container: '#b8b9b9'
  on-tertiary-container: '#484a4a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ccf05f'
  primary-fixed-dim: '#b1d446'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3c4d00'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c6'
  on-secondary-fixed: '#1b1b1b'
  on-secondary-fixed-variant: '#474747'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 72px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
  button-text:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 20px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  container-max: 1280px
---

## Brand & Style

This design system is built on a **Neo-Brutalist** foundation, characterized by high-energy visuals, "raw" structural elements, and a playful, unapologetic attitude. It targets a tech-savvy audience that values speed, transparency, and personality in their digital tools.

The aesthetic prioritizes high contrast and clear-cut boundaries. By using heavy black borders and vibrant lime accents, the UI feels physical and tactile, almost like a collection of stickers or printed zine cutouts. This "fun but functional" vibe transforms the mundane task of file sharing into a high-energy event, evoking a sense of urgency, reliability, and modern creative flair.

## Colors

The palette is intentionally restricted to maximize visual impact. **Lime Green (#A4C639)** serves as the primary action color, used for CTA buttons, progress indicators, and highlights. **Pure Black (#000000)** is used for all structural elements, including borders, heavy shadows, and typography.

The background is kept primarily **White (#FFFFFF)** or **Light Gray (#F0F0F0)** to ensure that the bold green and black elements "pop." For error states, a vibrant red with similar saturation to the lime green is permitted, but the primary interaction remains dominated by the high-contrast tri-tone of green, black, and white.

## Typography

The typography strategy uses a mix of three distinct typefaces to create hierarchy and technical character. **Space Grotesk** is used for headlines and hero text; its geometric, quirky terminals reinforce the futuristic and bold brand voice. 

**Hanken Grotesk** provides a clean, highly legible experience for body copy and descriptions, ensuring the app remains functional for daily use. **JetBrains Mono** is utilized for labels, file metadata, and micro-copy, lending a "pro-tool" or developer-centric feel to the file-handling aspects of the design system.

## Layout & Spacing

This design system employs a **Fixed Grid** model for desktop and a **Fluid Grid** for mobile. The layout is structured around an 8px base unit, with consistent 24px gutters to allow the heavy borders of UI components room to breathe without feeling cluttered.

- **Desktop:** A 12-column centered container (max-width 1280px).
- **Tablet:** An 8-column fluid grid with 32px side margins.
- **Mobile:** A 4-column fluid grid with 16px side margins.

Margins and paddings should be generous. Elements are often grouped into "panels" defined by thick black borders, creating a clear sense of containment and modularity.

## Elevation & Depth

In line with Neo-Brutalism, this design system rejects soft, ambient shadows. Instead, it uses **Bold Borders** and **Hard Shadows** to create depth.

- **Surface Tiers:** All interactive containers use a 2px or 3px solid black border.
- **Hard Shadows:** Instead of blurs, elements use a solid offset shadow (e.g., 4px x 4px or 8px x 8px) in pure black. This creates a "sticker" or "pop-out" effect.
- **Tonal Layers:** High-priority cards use the primary lime green as a background, while standard cards use white. When an element is hovered, the hard shadow usually disappears or "shrinks," simulating the element being pressed down into the page.

## Shapes

The shape language is strictly **Sharp (0)**. Everything from buttons to input fields to large containers uses 0px corner radii. This reinforces the "Brutalist" aspect of the brand, emphasizing raw structure and industrial precision. 

The only exception to the sharp-edge rule is the logo itself; all other UI components must maintain 90-degree angles to maintain the aggressive, high-energy aesthetic.

## Components

### Buttons
Primary buttons feature a Lime Green background, a 2px solid black border, and a 4px black hard shadow. Text is bold and uppercase. On hover, the shadow disappears and the button translates 2px down and right to simulate a physical press.

### Input Fields
Inputs use a white background with a 2px black border. The placeholder text uses the monospaced label font. When focused, the border thickness increases to 4px or gains a Lime Green hard shadow.

### Cards & File Tiles
Cards are the primary container. They feature a 2px black border and a prominent 8px black hard shadow. File type icons should be oversized and use the primary lime color.

### Chips
Used for file tags or status. Chips are white with a 2px black border and no shadow. They use the monospaced font for a technical look.

### Progress Bars
The track is a thick black outline with a white interior. The progress fill is solid Lime Green, moving in discrete blocks rather than a smooth gradient.

### Checkboxes & Radio Buttons
Strictly square (0px radius). When selected, they fill with solid Lime Green and a black checkmark/dot.