# Where to drop your assets

This folder is served at the site root (`/`).

## Logo (required to match your branding)
Drop your real circular **"TOGO INSIGHT" 5G** logo here as:

```
public/logo.png
```

That single file replaces the logo **everywhere** (navbar, dashboard sidebar,
login, signup, favicon fallback). Until you add it, the app shows the on-brand
placeholder `public/logo.svg` so nothing looks broken.

Recommended: square-ish PNG, transparent background, ~512×512.

## Optional marketing images
The landing page uses CSS-built 5G visuals so it looks complete without photos.
If you'd rather use your own imagery, drop files in `public/images/` and swap the
`hero-visual` blocks in `src/app/(marketing)/page.tsx` for `<img src="/images/...">`.
