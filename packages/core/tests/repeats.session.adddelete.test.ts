import { loadXForm, createFormSession } from '../src';
import { describe, test, expect } from 'vitest';

const XFORM = `
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml">
  <h:head>
    <model>
      <instance>
        <data id="r">
          <child><age/></child>
        </data>
      </instance>
      <bind nodeset="/data/child/age" type="int"/>
    </model>
  </h:head>
  <h:body>
    <repeat nodeset="/data/child">
      <input ref="age"/>
    </repeat>
  </h:body>
</h:html>`;

describe('FormSession repeat add/delete', () => {
  test('addRepeat returns concrete path and appends row', () => {
    const model = loadXForm(XFORM);
    const s = createFormSession(model);
    const p1 = s.addRepeat('/data/child');
    const p2 = s.addRepeat('/data/child');
    expect(p1).toBe('/data/child[1]');
    expect(p2).toBe('/data/child[2]');

    s.setValue('/data/child[2]/age', 33);
    expect(s.getValue('/data/child[2]/age')).toBe(33);

    s.deleteRepeat('/data/child', 1);
    // formerly [2] is now [1]
    expect(s.getValue('/data/child[1]/age')).toBe(33);
  });
});
