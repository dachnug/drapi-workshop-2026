<p class="eyebrow">Wiring it up</p>

## Code to render a table

```typescript
render() {
    const fields = parseFields(this.fields);
    if (fields.length === 0 || this.data.length === 0) {
      return html`<div class="empty" part="empty">${this.emptyText}</div>`;
    }
    return html`
      <table part="table">
        <thead>
          <tr>
            ${fields.map((field) => html`<th scope="col">${field}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${this.data.map(
            (row) => html`
              <tr>
                ${fields.map((field) => html`<td>${this.cellValue(row, field)}</td>`)}
              </tr>
            `
          )}
        </tbody>
      </table>
    `;
  }
```

--

## Code to fetch data

```typescript
export const fetchCustomers = async (howmany: number = 20): Promise<unknown> => {
  const url = `${target}&start=${count}&count=${howmany}`;
  try {
    const result = await keepFetch(url, {}, false);
    count += Array.isArray(result) ? result.length : 0;
    return result;
  } catch (error) {
    const msg = `Error fetching customer list: ${error}`;
    console.error(msg);
    throw error;
  }
};
```

--

<p class="eyebrow">hands-on</p>

## Implement the customer list

## Your turn.
