## Login

<p class="demo-slot"><b>DEMO SLOT:</b>Login</p>

```typescript
const result = await fetch('/api/v1/auth', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ username: safeUser, password: safePassword })
});
```

--

```typescript
 .then((response) => {
      if (!response.ok) {
        throw new Error(`Login failed: ${response.status} ${response.statusText}`);
      }
      return response;
    })
    .then((response) => response.json())
    .then((json) => extractCredentials(json))
    .catch((err) => {
      console.error(err);
      return err.message || 'An error occurred during login';
    });
```

--

```typescript
const extractCredentials = (json: any) => {
  const bearer = json.bearer;
  const claims = parseJwtClaims(bearer);
  const username = resolveUsernameFromClaims(claims);

  globalThis.localStorage.setItem('authToken', bearer);
  globalThis.localStorage.setItem('username', username);
  globalThis.localStorage.setItem('claims', JSON.stringify(claims));
  emitAuthChanged();
};
```

--

```typescript
export const parseJwtClaims = (token: string): Record<string, unknown> => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
  const decoded = atob(padded);
  return JSON.parse(decoded) as Record<string, unknown>;
};
```

--

```typescript
const emitAuthChanged = () => {
  globalThis.dispatchEvent(new CustomEvent('auth-changed'));
};
```

--

<p class="eyebrow">authenticated fetch</p>

```typescript
export const keepFetch = async (input: RequestInfo | URL, init: RequestInit = {}, reprompt: boolean = false): Promise<unknown> => {
  try {
    // Check: can we proceed
    const actualToken = await getOrFetchToken(reprompt);
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${actualToken}`);
    const response = await fetch(input, { ...init, headers });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (err) {
    console.error('keepFetch error:', err);
    throw err;
  }
};
```

--

<p class="eyebrow">authenticated fetch in action</p>

```typescript
const userInfoEventHandler = async () => {
  console.log('User info clicked');
  const pre = document.createElement('pre');
  try {
    const result = await keepFetch('/api/v1/userinfo', {}, true);
    pre.textContent = JSON.stringify(result, null, 2);
    replaceMainContent(pre);
  } catch (error) {
    const msg = `Error fetching user info: ${error}`;
    console.error(msg);
    pre.textContent = msg;
    replaceMainContent(pre);
  }
};
```
