# javarosa-js (MVP)

A tiny, fast subset of JavaRosa for JS/TS: XPath evaluation + form model + incremental recalc with repeats.

## Packages
- `@javarosa-js/core` — form model, instance tree, scheduler, session API
- `@javarosa-js/xpath` — minimal XPath evaluator focused on XForms functions

## Quick start

```ts
import { loadXForm, createFormSession } from '@javarosa-js/core';

const xml = `<h:html xmlns="http://www.w3.org/2002/xforms" ...>...</h:html>`;
const model = loadXForm(xml);
const s = createFormSession(model);

s.setValue('/data/a', 5);
console.log(s.evaluate('/data/b')); // e.g. 6
console.log(s.isValid('/data/someField')); // boolean

// repeats
const row2 = s.addRepeat('/data/child');          // => '/data/child[2]'
s.setValue(`${row2}/age`, 10);
s.deleteRepeat('/data/child', 1);
