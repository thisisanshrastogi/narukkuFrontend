---
name: skeuxpert
description: "Create clean, professional, industry-standard skeuomorphic frontends. Use for designing UI with tactile materials, realistic lighting, layered depth, and refined controls in Next.js (App Router) or React."
argument-hint: "Describe the page, features, and brand constraints; mention target devices and accessibility needs."
---

# Skeuomorphic Frontend Design

## When to Use

- You need a premium, tactile UI with realistic materials and depth.
- You want a clean, professional skeuomorphic look (not cartoonish or retro).
- You need a full page with components, tokens, and motion guidance.

## Core Outcomes

- A cohesive theme palette with material and lighting logic.
- CSS variables for colors, shadows, borders, and typography.
- Component set (cards, buttons, inputs, nav, badges, stat blocks).
- A polished layout with controlled depth, contrast, and spacing.

## Procedure

1. **Define the scene**
   - Identify the product context and tone (finance, health, creator tools).
   - Choose a primary surface material (brushed metal, soft leather, matte glass).
   - Select a lighting model (top-left soft key + subtle ambient fill).

2. **Build the palette**
   - Choose a base neutral for surfaces, a darker neutral for recesses, and a highlight.
   - Pick a single accent color for primary actions and a muted secondary accent.
   - Ensure a 4.5:1 contrast ratio for text against primary surfaces.

3. **Typography and rhythm**
   - Choose one display face and one readable body face.
   - Define a modular scale (e.g., 12/14/16/20/24/32/40).
   - Set generous line height (1.4–1.6) to avoid cramped skeuomorphism.

4. **Depth system**
   - Create a 3-tier depth scale: inset, base, lifted.
   - Use layered shadows with low blur for definition and higher blur for softness.
   - Keep border radii consistent (e.g., 12–16px for cards, 8–10px for inputs).

5. **Component styling**
   - Buttons: bevel + top highlight + subtle inner shadow.
   - Inputs: inset shadow + slightly darker well + crisp focus ring.
   - Cards: soft vignette + edge highlight + micro noise (optional).
   - Navigation: segmented controls with raised active states.

6. **Layout composition**
   - Use clear structural panels and distinct content blocks.
   - Emphasize one hero element; keep everything else calm.
   - Avoid busy textures; one material motif per surface.

7. **Motion and feedback**
   - Use a short lift on hover and a gentle press on active.
   - Apply subtle glow on focus for accessibility.
   - Stagger key elements on load (150–250ms).

8. **Implementation (Next.js App Router)**
   - Add CSS variables to `globals.css`.
   - Implement components in `src/components/` with consistent tokens.
   - Ensure responsive behavior with 1-column mobile and 2–3 column desktop.

## Quality Checklist

- Surfaces feel tactile but remain clean and professional.
- Shadows and highlights are consistent with the lighting direction.
- Buttons and inputs have clear state changes and accessible focus.
- Text is readable at all sizes; no over-embossing.
- Palette feels cohesive with one primary accent.

## Notes

- Avoid exaggerated textures and loud gradients.
- Prefer subtle material cues over heavy ornamentation.
- If adding noise, keep it under 4% opacity.
