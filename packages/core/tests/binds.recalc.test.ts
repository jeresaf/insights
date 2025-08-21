import { test, expect } from 'vitest';
import { loadXForm, createFormSession } from '../src';

const XFORM = `
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa">
  <h:head>
    <model>
      <instance>
        <data id="demo">
          <age/>
          <adult_only/>
          <limited/>
        </data>
      </instance>
      <bind nodeset="/data/age" type="int" />
      <bind nodeset="/data/adult_only" relevant="/data/age >= 18" required="true()" />
      <bind nodeset="/data/limited" constraint=". <= 10"/>
    </model>
  </h:head>
  <h:body/>
</h:html>`;

test('relevance and required flip with age', () => {
  const model = loadXForm(XFORM);
  const s = createFormSession(model);
  s.setValue('/data/age', 17);
  expect(s.isRelevant('/data/adult_only')).toBe(false);
  s.setValue('/data/age', 21);
  expect(s.isRelevant('/data/adult_only')).toBe(true);
  expect(s.isRequired('/data/adult_only')).toBe(true);
});

test('constraint on dot is enforced', () => {
  const model = loadXForm(XFORM);
  const s = createFormSession(model);
  s.setValue('/data/limited', 11);
  expect(s.isValid('/data/limited')).toBe(false);
  s.setValue('/data/limited', 10);
  expect(s.isValid('/data/limited')).toBe(true);
});