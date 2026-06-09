<span class="timing stretch">17:05 – 17:20 · <span class="type-demo">Demo</span></span>

## Deployment: vite

```bash
npm run build
```

then copy `dist`

--

## Deployment: `manifest.json`

What gets exposed, and how.

```json
{
  "short_name": "Some name",
  "name": "a SPA to relax",
  "start_url": ".",
  "theme_color": "#000000",
  "background_color": "#aacccc",
  "icon": "logo.png",
  "csp": "default-src 'self'; img-src 'self' data:; report-uri /api/csp-violation-report; connect-src 'self' https://somewhere.else; font-src 'all';"
}
```

## CSP use a generator: https://report-uri.com/home/generate
