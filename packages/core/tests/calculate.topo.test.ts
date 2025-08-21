import { test, expect } from 'vitest';
import { loadXForm, createFormSession } from '../src';

const XFORM = `
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa">
  <h:head>
    <model>
      <instance>
        <data id="demo">
          <a/>
          <b/>
          <c/>
          <oncev/>
        </data>
      </instance>
      <bind nodeset="/data/a" type="int" />
      <bind nodeset="/data/b" calculate="/data/a + 1"/>
      <bind nodeset="/data/c" calculate="/data/b + 1"/>
      <bind nodeset="/data/oncev" calculate="once(5)"/>
    </model>
  </h:head>
  <h:body/>
</h:html>`;

test('changing a recalcs b then c in order', () => {
  const model = loadXForm(XFORM);
  const s = createFormSession(model);
  s.setValue('/data/a', 5);
  expect(s.evaluate('/data/b')).toBe(6);
  expect(s.evaluate('/data/c')).toBe(7);
});

test('once() preserves first write', () => {
  const model = loadXForm(XFORM);
  const s = createFormSession(model);
  // first recalc writes 5 into oncev
  expect(s.evaluate('/data/oncev')).toBe(5);
  // change a and ensure oncev unaffected
  s.setValue('/data/a', 10);
  expect(s.evaluate('/data/oncev')).toBe(5);
});