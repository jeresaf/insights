import { InstanceTree } from '../src/instance/Tree';
import { findAllConcrete } from '../src/instance/findConcrete';
import { test, expect } from 'vitest';

test('findAllConcrete expands repeated segments', () => {
  const xml = `<data><child></child></data>`;
  const t = new InstanceTree(xml);

  // no repeats yet
  expect(findAllConcrete(t, '/data/child/age')).toEqual(['/data/child/age']);

  // add 2 rows
  t.appendRepeat('/data/child');
  t.appendRepeat('/data/child');
  const res = findAllConcrete(t, '/data/child/age');
  expect(res.sort()).toEqual(['/data/child[1]/age', '/data/child[2]/age'].sort());
});
