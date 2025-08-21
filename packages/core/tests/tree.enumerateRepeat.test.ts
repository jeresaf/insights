import { InstanceTree } from '../src/instance/Tree';
import { test, expect } from 'vitest';

test('enumerateRepeat lists concrete indices', () => {
  const xml = `<data><child></child></data>`;
  const t = new InstanceTree(xml);
  expect(t.enumerateRepeat('/data', 'child')).toEqual([]);

  t.appendRepeat('/data/child');
  t.appendRepeat('/data/child');
  expect(t.enumerateRepeat('/data', 'child')).toEqual([1, 2]);

  t.removeRepeat('/data/child', 0); // remove first → leaves [2] becoming new [1]
  expect(t.enumerateRepeat('/data', 'child')).toEqual([1]);
});
