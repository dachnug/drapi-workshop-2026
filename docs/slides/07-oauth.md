<span class="timing">14:30 – 14:55 · <span class="type-lecture">Vortrag &amp; Demo</span></span>

<p class="eyebrow">Block 6</p>

## From username/password to OAuth

Why basic auth doesn't scale - and the CORS trap. <!-- .element: style="color:var(--muted)" -->

--

### The bearer-token flow with simple login

```bash
# 1. Exchange credentials for a token (once)
curl -X POST https://YOUR-HOST/api/v1/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"...","password":"..."}'
# → { "bearer": "eyJ..." }

# 2. Use the token on every call
curl https://YOUR-HOST/api/v1/document?dataSource=demo \
  -H "Authorization: Bearer eyJ..."
```

--

### OAuth (PKCE version) to obtain a bearer

- find IdPs [IdP list (Port 8889)](https://keep.dnug.rocks:8889/idp)
- read .well-known
- start the dance

![IdP, SP, Resource](./OIDC.png)

--

## Login is elsewhere ( or not)

```typescript
export const oidcLogin = (configUrl) => {
  try {
    const codeVerifier = generateCodeVerifier();
    const state = generateCodeVerifier(32);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const config = await getIdp(configUrl);
    window.location.href = loginUrl(config, codeChallenge, state);
  } catch (e) {
    console.error(e.message);
    alert('can not OIDC');
  }
};
```

--

## Code to token

```typescript
const tokenResponse = await fetch(token_endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: OIDC_CLIENT_ID,
    code: code ?? '',
    redirect_uri: redirectURI.toString(),
    code_verifier: codeVerifier ?? '',
    state: state ?? ''
  })
});
```

### CORS - the browser trap

**Cross-Origin Resource Sharing.** The browser decides which pages may call your API.

Symptom: works in curl &amp; Bruno, fails in the browser. The commonest "why is my app broken" moment - and you'll meet it today. <!-- .element: style="margin-top:1em; color:var(--muted)" -->
