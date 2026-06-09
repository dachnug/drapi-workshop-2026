<span class="timing">16:35 – 17:05 · <span class="type-demo">Demo &amp; Exercise</span></span>

<p class="eyebrow">Block 11</p>

## Creating forms &amp; views

The schema/design side of DRAPI. **Your Notes instincts mostly transfer here.**

- Define a form (the schema)
- Define a view (the query result)
- Read it back through the API

--

## Database

`POST {{HOST}}/api/setup-v1/design/nsf`

```json
{
  "nsfPath": "samples/{{$randomAbbreviation}}.nsf",
  "title": "Sample Db {{$isoTimestamp}}"
}
```

--

## Form

`PUT {{HOST}}/api/setup-v1/design/forms/Stuff?nsfPath={{NSFPATH}}`

```json
{
  "name": "Stuff",
  "alias": "Sachen",
  "fields": [
    {
      "allowmultivalues": false,
      "name": "color",
      "type": "text"
    },
    {
      "allowmultivalues": false,
      "name": "taste",
      "type": "text"
    },
    {
      "allowmultivalues": true,
      "name": "shape",
      "type": "text"
    }
  ]
}
```

--

## View

`PUT {{HOST}}/api/setup-v1/design/views/StuffList?nsfPath={{NSFPATH}}`

```json
{
  "columns": [
    {
      "formula": "color",
      "name": "color",
      "sort": "ascending",
      "title": "color"
    },
    {
      "formula": "taste",
      "name": "taste",
      "sort": "ascending",
      "title": "taste"
    },
    {
      "formula": "shape",
      "name": "shape",
      "title": "shape"
    }
  ],
  "name": "StuffList",
  "selectionFormula": "Form = \"Stuff\""
}
```
