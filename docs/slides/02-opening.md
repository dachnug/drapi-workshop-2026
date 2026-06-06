<span class="timing">13:00 – 13:15 · <span class="type-lecture">Vortrag</span></span>

<p class="eyebrow">Block 1</p>

## From Notes to the web

Everything today rests on this mental remapping. <!-- .element: style="color:var(--muted)" -->

Note: Keep to time. Resist deep dives - they come later.

--

<!-- .slide: class="center-title" -->

### Kennen wir → das lernt uns noch kennen

<div class="map">
  <span class="from">Document</span><span class="arrow">→</span><span class="to">JSON resource</span>
  <span class="from">Form</span><span class="arrow">→</span><span class="to">Schema</span>
  <span class="from">View</span><span class="arrow">→</span><span class="to">View or Query result</span>
  <span class="from">Notes client</span><span class="arrow">→</span><span class="to">Browser</span>
  <span class="from">RichText</span><span class="arrow">→</span><span class="to">HTML &amp; CSS</span>
  <span class="from">Notes Id</span><span class="arrow">→</span><span class="to">JWT</span>
</div>

--

<!-- .slide: class="center-title" -->

### Buchstabensuppe → wozu

<div class="map">
  <span class="from">HTML</span><span class="arrow">→</span><span class="to">Struktur</span>
  <span class="from">CSS</span><span class="arrow">→</span><span class="to">Layout</span>
  <span class="from">TS/JS</span><span class="arrow">→</span><span class="to">Verhalten</span>
  <span class="from">CORS</span><span class="arrow">→</span><span class="to">Querzulassung, web edition</span>
  <span class="from">CSP</span><span class="arrow">→</span><span class="to">Ausführungsberechtigung</span>
  <span class="from">IdP</span><span class="arrow">→</span><span class="to">Identitätsquelle</span>
  <span class="from">OIDC</span><span class="arrow">→</span><span class="to">Ausweisverfahren</span>
</div>

--

<!-- .slide: class="center-title" -->

### The verbs &amp; the codes

**GET** read · **POST** create · **PATCH** update · **DELETE** remove

Status codes you'll meet: <!-- .element: style="margin-top:1.2em" -->

- **200** - alles OK
- **400** - Invalid request, won't be entertained
- **401** - not authenticated (kenn Dich nicht, also darfst Du nichts)
- **403** - authenticated, but not allowed ( kenn Dich, deshalb darfst **DU** das nicht)
- **404** - not found
- **409** - conflict _(like a Notes save conflict)_
- **500** - The sever screwed up

And: the server is **stateless**. Each request stands alone. <!-- .element: style="margin-top:1em; color:var(--muted)" -->
