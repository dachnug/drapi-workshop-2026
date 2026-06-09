<span class="timing">16:15 – 16:35 · <span class="type-demo">Demo &amp; Exercise</span></span>

<p class="eyebrow">Block 10</p>

## Multi-value fields Notes

```json
{
  "Equipment": ["acBook Pro M2", "Pencil"],
  "Cost": [3267.0, 1.2],
  "Comments": ["silver", "B Type"]
}
```

## Multi-value fields in DRAPI

```json
{
      "0": {
        "Comments": "silver",
        "Cost": 3267.0,
        "Equipment": "MacBook Pro M2"
      },
      "1": {
        "Comments": "HB Type",
        "Cost": 1.2,
        "Equipment": "Pencil"
      }
    }
}
```

--

## .map / .flatMap

```typescript
data.flatMap((entry) => Object.values(entry.items ?? {}));
```

## .reduce

```typescript
const initial = {};
transformed.reduce((accumulator, element) => reduceHardware(accumulator, element), initial);
```
