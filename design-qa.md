# Design QA — Unique Care Revamp

- Source visual truth: `C:\Users\User\.codex\generated_images\019fcb9e-3636-7572-abfc-11b068bb621e\exec-0aca2d67-a452-4b7e-999d-1b22b3d99a4e.png`
- Implementation screenshot: `C:\Users\User\Documents\Amaan Work\uniquescare\qa-revamp-home.png`
- Focused section screenshot: `C:\Users\User\Documents\Amaan Work\uniquescare\qa-revamp-sections.png`
- Comparison image: `C:\Users\User\Documents\Amaan Work\uniquescare\qa-revamp-comparison.png`
- Browser viewport: 1265 × 712 CSS pixels, density 1
- Source pixels: 793 × 1983
- Implementation pixels: 1265 × 712
- Normalization: the source was cropped to the same above-the-fold aspect ratio and the implementation was resized to 793 px wide for the side-by-side comparison.
- State: desktop homepage, default navigation state; service section checked as a focused region.

## Full-view comparison evidence

The selected clinical-editorial direction and implementation share the same defining hierarchy: dark schedule strip, white navigation, serif-led split hero, navy/emerald/cobalt palette, scanner-dominant imagery, clear appointment CTA and editorial service sections. The implementation deliberately uses the supplied source logo and original Unique Care imagery rather than generated substitutes.

## Focused region evidence

The MRI/CT services region was checked independently because the full source mock makes its body copy too small to judge. The implementation has clear image quality, readable copy, strong alignment, consistent type hierarchy and a restrained tinted surface matching the selected direction.

## Required fidelity surfaces

- Fonts and typography: Source Serif 4 and DM Sans closely reproduce the editorial display/body contrast. Weight, leading, wrapping and hierarchy are consistent across home and inner pages.
- Spacing and layout rhythm: the split hero, service schedule, editorial grids and section spacing follow the selected design. Inner pages reuse the same grid, spacing and CTA patterns.
- Colors and tokens: deep navy, emerald, cobalt, off-white and muted mint are mapped to reusable CSS tokens and maintain readable contrast.
- Image quality and asset fidelity: all visible imagery uses the original Unique Care/source-site assets. No broken images were found on any of the 13 routes. The user-supplied mark was enhanced and optimized as a 256 px favicon.
- Copy and content: genuine MRI, CT, location, contact and review content is retained. Obvious WordPress placeholder text was replaced with relevant patient-facing information.

## Comparison history

1. Initial finding — P2 horizontal overflow on the homepage caused by review carousel controls extending beyond the viewport.
   - Fix: moved both review controls inside the carousel boundary and added page-level overflow protection.
   - Post-fix evidence: browser measurement reports `scrollWidth === clientWidth` on the homepage and every inner route.
2. Initial focused-section capture showed content during its entrance transition.
   - Fix: repeated the capture after the transition completed.
   - Post-fix evidence: `qa-revamp-sections.png` shows full opacity and final layout.

## Interaction and route checks

- 13 routes rendered successfully.
- Dropdown opens and exposes all five location links.
- Review carousel advances.
- MRI FAQ expands and reports `aria-expanded="true"`.
- Appointment form renders five location choices and retains its submission endpoint.
- No broken images or horizontal overflow were found.

## Follow-up polish

- P3: additional original location photography could further differentiate Thane and Pune Aundh if those source images become available.

final result: passed
