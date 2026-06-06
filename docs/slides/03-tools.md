<span class="timing">13:15 – 13:30 · <span class="type-lecture">Vortrag</span></span>

<p class="eyebrow">Block 2</p>

## Das Zeigen der Werkzeuge\*

This is a very opinionated selection, you are welcome to prefer other tools

Jeder Handweker hat sein Werkzeug, der eine schwört auf Bosch, der andere auf Hilti. <!-- .element: style="color:var(--muted)" -->

<p>&nbsp;</p>
<p>&nbsp;</p>
<p>&nbsp;</p>
<p>&nbsp;</p>
<p>&nbsp;</p>

### <sup>\*</sup> Erste Stufe der Folter im Mittelalter

--

### Browser zentrisch

| Was                 | Wozu                                      | Was nicht           |
| :------------------ | :---------------------------------------- | :------------------ |
| **Developer tools** | Build in browser (or console ninja)       | `alert()`           |
| **Node.js**         | the JavaScript runtime everything sits on | deno, bun           |
| **TypeScript**      | typed JavaScript                          | vanilla JS          |
| **Vite**            | fast build tool, live reload              | Webpack, esbuild    |
| **vitest**          | testing framework, works with vite        | mocha, jest         |
| **WebAwesome**      | Components and application styling        | material, bootstrap |
| **lit**             | Webcomponent compiler                     | react, angular      |

<p>&nbsp;</p>
<p>&nbsp;</p>

### Auf der Kommandozeile

| Was       | Wozu                                       | Was nicht           |
| :-------- | :----------------------------------------- | :------------------ |
| **Bruno** | file-based API client _(YAML .yml format)_ | postman, hoppscotch |
| **curl**  | HTTP from the command line                 | wget                |
| **jq**    | JSON tool                                  | grep, sed           |
| **npm**   | Node packet manager (part of NodeJS )      | pnpm                |
| **npx**   | Node packet executor                       |                     |
| **ncu**   | npm check update                           |                     |

--

### One request, three ways

- bruno
- Developer tools
- curl

```bash
curl https://keep.dnug.rocks:8880/api  | jq

```

<p class="demo-slot"><b>DEMO SLOT:</b>curl on the command line</p>
<p class="demo-slot"><b>DEMO SLOT:</b>Bruno UI</p>
<p class="demo-slot"><b>DEMO SLOT:</b>fetch() in the developer tools</p>
