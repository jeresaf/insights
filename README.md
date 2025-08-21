# javarosa-js (MVP scaffold)

This is a **pnpm workspace** with the initial scaffold for a JavaRosa-like runtime in TypeScript.

## Quickstart

```bash
pnpm i
pnpm build
```

## Packages

- `@javarosa-js/utils` – XML helpers (xmldom)
- `@javarosa-js/xforms` – Minimal XForm parser (model, instance, itext, binds)
- `@javarosa-js/xpath` – Tiny XPath subset evaluator sufficient for smoke tests
- `@javarosa-js/core` – Public API: `loadXForm`, `createFormSession`

## Smoke usage

```ts
import { loadXForm, createFormSession } from '@javarosa-js/core';

const xform = `
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa">
  <h:head>
    <model>
      <instance>
        <data id="demo">
          <age/>
          <eligible/>
        </data>
      </instance>
      <bind nodeset="/data/age" type="int" />
      <bind nodeset="/data/eligible" type="string" relevant="/data/age >= 18" />
    </model>
  </h:head>
  <h:body/>
</h:html>`;

const model = loadXForm(xform);
const session = createFormSession(model);
session.setValue('/data/age', 21);
console.log(session.evaluate('/data/age >= 18')); // true
console.log(session.serialize());
```

> Note: This is an MVP scaffold. Recalc graph, full binds, and complete XPath will be built incrementally.