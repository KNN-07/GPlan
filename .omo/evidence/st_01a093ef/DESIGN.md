# Exercise viewer component contract

## 0. Research log
- Read frontend design, minimalist, Nike, interaction, perfection and visual-qa references. Athletic product-stage restraint from Nike; compact editorial controls from minimalist. User's lime/ivory direction takes precedence over reference palettes.
- Read beui action-swap source: explicit value-controlled action, meaningful icon/label swap, reduced-motion path. Adapt without adding Motion.
- This is a scoped library component, not app design. Root design, dependency installs, external asset research and generated imagery are outside ownership; no image-generation, monitor or delegation tools are exposed.

## 1. Atmosphere
A quiet training studio: real lit, rounded graphite sculpture on a circular stage, with muscle color carrying meaning rather than decorative glow. No external assets.

## 2. Color
Scene #202823; stage #2b352d; line #475044; body #88958b; joints #39463e; primary #c6f36b; secondary #dfad86; text #f4f3e9; muted #b4bdb3; controls #354137; hover #455447; dark ink #202823. Material roughness .5-.8, metal .2-.65. Warm key and cool rim lighting create real dimensionality.

## 3. Typography
Inherit host font with Helvetica Neue/Arial fallback. 14px body/control, 12px meta; 20px fallback title. Weights 400/500/650. No downloaded fonts.

## 4. Spacing and layout
4px base; 8/12/16/24px gaps and padding. Viewer fills container width with 12px radius, bounded canvas height clamp(320px,48vw,440px). Controls and muscle legend wrap at any container width. No independent scroll owner.

## 5. Primitives
- Scene: one live WebGL canvas; default, paused, reduced-motion, hidden, context-lost and unsupported states.
- Controls: 44px minimum hit targets, 8px radius; play toggle, reset view, front/side/back views. Native buttons with visible focus, hover tint, press scale .98, disabled fallback controls.
- Legend: primary and secondary labeled dots plus explicit muscle names; wrap naturally; meaning never color-only.
- Figure: reusable ellipsoids, capsules and nested joint groups, with muscle patches attached to relevant limbs. Procedural props share palette/materials.

## 6. Motion
Schematic repetitions: 4 seconds, cosine-eased closed loops. Orbit is direct manipulation, no auto-rotation or inertial movement. No animation when paused, page hidden, offscreen or unmounted; reduced motion defaults to paused with explicit opt-in. Button feedback 120ms; reduced motion removes transitions.

## 7. Depth
Tonal-shift DOM surfaces, real 3D lights and cast shadows. Circular stage rim and floor grid provide camera orientation. No fake raster backdrop.

## 8. Accessibility and limitations
Keyboard-native play/reset/view presets, visible focus, readable contrast, canvas descriptive label, static semantic fallback retaining muscles and instructions. Always label schematic and not technique guidance. Not anatomical simulation or exercise coaching. The host must mount only in detail and preferably lazy-load this module. App-wide Lighthouse and independent review belong to lead integration; unavailable child tools are reported, not silently marked passed.
