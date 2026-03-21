# Elevation Profile — Original Design Reference

This documents the original elevation profile component (`components/routes/elevation-profile.tsx`) before the visual redesign on 2026-03-21. Use this to revert if needed.

## Visual Design (Before Redesign)

### Background
- Warm off-white: `#f8f6f3`
- Rounded corners: `rounded-lg`
- Padding: `p-3`

### Line
- Color: muted sage green `#7A8F6F`
- Width: `1.2px` (non-scaling stroke)
- Linecap/join: round
- Path type: straight line segments (`M... L... L...`) — no curve interpolation

### Gradient Fill
- Extremely faint, barely visible
- SVG `<linearGradient>` with 3 stops:
  - 0%: `#8B9D83` at opacity `0.04`
  - 50%: `#A8B99E` at opacity `0.025`
  - 100%: `#C5D3BC` at opacity `0.01`
- Area path: line points → bottom-right → bottom-left → close

### Grid Lines
- 4 horizontal dashed lines at y=20, 40, 60, 80 (SVG coordinates)
- Color: `#B8B8B8`
- Width: `0.4px`
- Dash pattern: `2,4`
- Opacity: `0.55`

### Y-Axis (Left Side)
- Labels: min, mid, max elevation in meters
- Font: `text-[9px] text-slate-400 font-light`
- Width: `w-10` fixed
- Right-aligned with `pr-1`
- 14px spacer at top for floating marker gutter alignment

### X-Axis (Bottom)
- 5 labels: 0, 25%, 50%, 75%, 100% of total distance
- Font: `text-[9px] text-slate-400 font-light`
- Left margin: `ml-11` (to align with chart area past Y-axis)

### Key Points (Inline Mode)
- White circles with green border: `w-2.5 h-2.5 rounded-full bg-white border-2 border-green-600`
- Labels: elevation in meters, positioned above or below the point
- Font: `text-[10px] font-semibold text-gray-700`
- Shows: start, end, highest, lowest points

### Hover Interaction
- Vertical dashed line: `#16A34A`, width `0.5`, dash `2,2`
- Dot on line: `w-3 h-3 rounded-full bg-green-600 border-2 border-white shadow`
- Tooltip: dark bg (`bg-gray-900`), white text, shows elevation and distance

### Floating Markers (Floating Mode)
- Gutter height: `h-14` above chart
- Waypoints: colored circles (green=start, red=finish, blue=waypoint), `w-6 h-6`
- Hazards: amber triangles with `!`, `w-5 h-5`
- Stagger tiers: up to 3 levels, 22px apart, 5% overlap threshold
- Drop lines: dashed vertical lines from marker to bottom, `0.8px`, marker color, opacity `0.65`
- Intersection dots: `r=0.8`, marker color, opacity `0.7`

## SVG ViewBox
- `viewBox="0 0 400 100"` with `preserveAspectRatio="none"`
- X range: 0-400 (mapped from distance)
- Y range: 0-100 (mapped from elevation, inverted — 0 is top, 100 is bottom)

## How to Revert
Replace the contents of `components/routes/elevation-profile.tsx` with the version from the git commit prior to the redesign. Or use `git log --oneline -- components/routes/elevation-profile.tsx` to find the last commit before changes.
