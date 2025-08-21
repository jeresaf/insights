import { loadXForm, createFormSession } from '../src';
import { test, vi, expect } from 'vitest';

const XFORM = `
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml">
  <h:head>
    <model>
      <instance>
        <data id="r"><child><age/></child></data>
      </instance>
      <bind nodeset="/data/child/age" type="int" constraint=". <= 10"/>
    </model>
  </h:head>
  <h:body>
    <repeat nodeset="/data/child">
      <input ref="age"/>
    </repeat>
  </h:body>
</h:html>`;

test('constraint is enforced per repeat instance', () => {
  const model = loadXForm(XFORM);
  const s = createFormSession(model);
  const p1 = s.addRepeat('/data/child');
  const p2 = s.addRepeat('/data/child');

  s.setValue(`${p1}/age`, 9);
  s.setValue(`${p2}/age`, 11);

  expect(s.isValid(`${p1}/age`)).toBe(true);
  expect(s.isValid(`${p2}/age`)).toBe(false);
});

test('constraint recomputes when writing to an indexed row', () => {
  const model = loadXForm(XFORM);
  const s = createFormSession(model);
  const p1 = s.addRepeat('/data/child');
  const p2 = s.addRepeat('/data/child');

  const spy = vi.spyOn(s, 'evaluate'); // should run inside recalc
  s.setValue(`${p2}/age`, 11);
  expect(spy).toHaveBeenCalled(); // sanity
});