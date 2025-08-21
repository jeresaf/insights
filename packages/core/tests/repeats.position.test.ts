import { loadXForm, createFormSession } from '../src';
import { test, expect } from 'vitest';

const XFORM = `
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa">
  <h:head>
    <model>
      <instance>
        <data id="r"><child><age/><ord/></child></data>
      </instance>
      <bind nodeset="/data/child/ord" calculate="position(..)"/>
    </model>
  </h:head>
  <h:body>
    <repeat nodeset="/data/child">
      <input ref="age"/>
      <input ref="ord"/>
    </repeat>
  </h:body>
</h:html>`;

test('position(..) gives row index inside repeat', () => {
  const s = createFormSession(loadXForm(XFORM));
  const p1 = s.addRepeat('/data/child');
  const p2 = s.addRepeat('/data/child');
  const p3 = s.addRepeat('/data/child');
  expect(s.getValue(`${p1}/ord`)).toBe(1);
  expect(s.getValue(`${p2}/ord`)).toBe(2);
  expect(s.getValue(`${p3}/ord`)).toBe(3);
});
