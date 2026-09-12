# GPlan UI design contract

## Direction
Premium training journal: warm paper, forest ink, lime wayfinding. The memorable moment is the oversized editorial headline beside a dark training card, not artificial performance charts. The supplied brief is the visual authority. Offline system fonts and local SVG anatomy are intentional.

## Tokens
Canvas #f4f3e9; surface #fcfcf6; ink #20352b; muted #637064; rule #d9ddd1; action #c6f36b; dark #20352b; error #963d2e. Type: Arial/Helvetica system sans, display tight -0.065em; sizes 12,14,16,20,24,32,48,72px. Spacing 4,8,12,16,24,32,48,64. Radius 8 controls, 16 training card; subtle surface shadow only for dialogs.

## Layout
Desktop 224px fixed navigation, flexible document body with max-width 1280px. Catalog: two-column editorial header, muscle strip, filter bar, three-column exercise grid. Mobile: compact header, stacked hero, horizontal focus chips, one-column exercises, persistent bottom navigation with safe-area spacing. Document owns scroll; dialogs have bounded internal scroll. No 3D outside details.

## Primitives and states
Button (primary lime, secondary rule, quiet text, destructive), chip (pressed lime), field (label above, visible focus ring), notice (status/error), exercise tile (SVG schematic, metadata, detail target, separate add button), dialog (native focus trap, escape, restoration). Every interactive target >=44px. Hover communicates clickability; press uses tiny transform. Reduced-motion disables transitions.

## Accessibility
Semantic navigation, form labels, native selects and dialogs. Dialog headings name each modal. Focus restoration after dismissal; dialogs scroll at 390x844. Status/error regions expose persistence and provider results. Icons are decorative SVG with visible text or accessible labels. No color-only unavailability indication.

## Implementation and accepted limits
Existing core boundaries validate stored state, imports, generated plans. API keys remain React memory only. Native dialogs beat a custom focus-trap implementation; small screen components beat a large single-file app. No extra dependencies/config changes under the assigned scope. Image generation/research tools unavailable; no external imagery or remote font dependencies. LSP harness reported unavailable by lead; compiler is the diagnostic validator. Self-review replaces reviewer panels per assignment.
