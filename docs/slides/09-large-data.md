<span class="timing">15:25 – 15:40 · <span class="type-demo">Demo</span></span>

<p class="eyebrow">Block 8</p>

## Dealing with large data

Never fetch everything. Page through it.

```bash
# count + start = a page
curl "https://YOUR-HOST/api/v1/lists/products\
?dataSource=demo&count=25&start=0" -H "Authorization: Bearer $TOKEN"
```

Why: payload size, server load, perceived speed. <!-- .element: style="color:var(--muted)" -->
