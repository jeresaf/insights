import { InstanceTree } from '../src/instance/Tree';
import { test, expect } from 'vitest';

test('exists() reflects structure, not value', () => {
  // Minimal root with one repeat container 'child'
  const xml = `<data><child></child></data>`;
  const t = new InstanceTree(xml);

  expect(t.exists('/data')).toBe(true);
  expect(t.exists('/data/child[1]')).toBe(false);

  // add two repeats
  t.appendRepeat('/data/child');
  t.appendRepeat('/data/child');

  expect(t.exists('/data/child[1]')).toBe(true);
  expect(t.exists('/data/child[2]')).toBe(true);
  expect(t.exists('/data/child[3]')).toBe(false);
});
