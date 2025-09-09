# Company Logo Setup

## Adding Your Company Logo

To add your company logo to the machine vision news site:

1. **Save your logo as PNG format** at `assets/company-logo.png`
   - Recommended size: 100-150px width, proportional height
   - The logo will be automatically resized to ~28-32px height in the header

2. **Logo Display Hierarchy**:
   The system will automatically detect and use logos in this order:
   - `assets/company-logo.png` (your custom logo)
   - `assets/company-logo.svg` (SVG version if available)
   - `assets/logo-placeholder.svg` (fallback placeholder)

3. **Logo Placement**:
   - **Header**: Left side of the header, next to project title
   - **Card Watermarks**: Small logo watermark at bottom-right of each news card
   - **Exported PNGs**: Watermark included in downloaded images (1080x1080)

## Supported Formats
- **PNG**: Recommended for photographic logos
- **SVG**: Recommended for vector/text logos (better scaling)

## Logo Requirements
- Clear visibility at small sizes (28-32px height)
- Good contrast against white and light backgrounds
- Suitable for both header display and watermark use