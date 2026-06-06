<span class="timing">13:40 – 13:50 · <span class="type-demo">Demo</span></span>

<p class="eyebrow">Block 4</p>

## Let's get physical

<p class="demo-slot"><b>DEMO SLOT:</b>Bauzaun mit vite errichten</p>

--

```shell
npm create vite@latest
```

![Vite create](vitecreate.png)

## [OPEN in browser](http://localhost:5173/)

--

<p class="eyebrow">Replace boilerplate</p>

```bash
npm install --save @awesome.me/webawesome
npm install --save-dev vitest jsdom @vitest/coverage-v8
```

```html
<!doctype html>
<html lang="en" class="wa-theme-default wa-palette-default wa-brand-blue"
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/ico" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DACHNUG 2026</title>
    <link rel="stylesheet" href="./src/index.css" />
    <script type="module" src="/src/index.ts"></script>
  </head>
  <body>
    <wa-page>...</wa-page>
  </body>
</html>
```

--

```html
<wa-page>
  <span slot="skip-to-content">Zum Inhalt springen</span>
  <div slot="header" id="dachnug-header">DACHNUG 2026</div>
  <div slot="subheader">action bar goes here</div>
  <div slot="navigation-header">Your choices</div>
  <div slot="navigation">navigation goes here</div>
  <h1>Hello world</h1>
  <div slot="footer">&copy; 2026 HCL, DNUG, Apache License 2.0</div>
</wa-page>
```

--

<p class="eyebrow">Some typescript</p>

```typescript
import '@awesome.me/webawesome/dist/styles/webawesome.css';
import '@awesome.me/webawesome/dist/styles/themes/default.css';

import '@awesome.me/webawesome/dist/components/page/page.js';

const startApplication = () => {
  console.log('Application initialized');
};

// Initialize the app
if (document.readyState != 'loading') {
  startApplication();
} else {
  document.addEventListener('DOMContentLoaded', startApplication);
}
```

--

<p class="eyebrow">Get some API info</p>

```typescript
const getApiListRaw = async (): Promise<string> => {
  const response = await fetch('/api');
  if (!response.ok) {
    const msg = `Error fetching API list: ${response.status} ${response.statusText}`;
    console.error(msg);
    return msg;
  }
  try {
    const responseBody = await response.json();
    return JSON.stringify(responseBody, null, 2);
  } catch (error) {
    const msg = `Error parsing API list: ${error}`;
    console.error(msg);
    return msg;
  }
};
```

### Not what we expected...

--

<p class="eyebrow">vite.config.ts</p>

```typescript
import { defineConfig } from 'vite';

const apiProxy = {
  '/api': {
    target: 'https://keep.dnug.rocks:8880',
    changeOrigin: true,
    secure: true
  }
};

export default defineConfig({
  server: {
    proxy: apiProxy
  },
  preview: {
    proxy: apiProxy
  }
});
```
