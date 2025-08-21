import { loadXForm, createFormSession } from '../src';
import { test, expect } from 'vitest';

const XFORM = `
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa">
  <h:head>
    <model>
      <instance>
        <data id="r"><child><age/></child><pick2/></data>
      </instance>
      <bind nodeset="/data/child/age" type="int"/>
      <bind nodeset="/data/pick2" calculate="indexed-repeat('/data/child/age', '/data/child', 2)"/>
    </model>
  </h:head>
  <h:body>
    <repeat nodeset="/data/child">
      <input ref="age"/>
    </repeat>
    <input ref="/data/pick2"/>
  </h:body>
</h:html>`;

test('indexed-repeat returns nth instance value (MVP string path args)', () => {
  const s = createFormSession(loadXForm(XFORM));
  const p1 = s.addRepeat('/data/child');
  const p2 = s.addRepeat('/data/child');
  s.setValue(`${p1}/age`, 11);
  s.setValue(`${p2}/age`, 22);
  // calculate should reflect the 2nd row's age
  expect(s.getValue('/data/pick2')).toBe(22);
});
