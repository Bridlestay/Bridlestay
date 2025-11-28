# Logo Instructions

## Current Status

✅ A placeholder logo has been added to the header at `/public/logo.svg`

## Replacing with Your Actual Logo

To use your green "B" horse logo (from the images you provided):

### Option 1: PNG Format (Recommended for your logo)
1. Save your logo as `logo.png` in the `/public` folder (replacing logo.svg)
2. Update line 96 in `components/header.tsx`: change `src="/logo.svg"` to `src="/logo.png"`
3. Recommended dimensions: 200x200px or higher (square format)

### Option 2: SVG Format (Best for scalability)
1. Save your logo as `logo.svg` in the `/public` folder (replacing the placeholder)
2. No code changes needed - the header is already configured to use SVG

## Current Configuration

The logo displays at 36x36px in the header with a 3-spacing gap between the logo and "BridleStay" text.

Location: `components/header.tsx` lines 94-105

