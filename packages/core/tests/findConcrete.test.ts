import { InstanceTree } from '../src/instance/Tree';
import { findAllConcrete } from '../src/instance/findConcrete';
import { test, expect } from 'vitest';

test('findAllConcrete lists all instance paths for nodeset', () => {
  const t = new InstanceTree('<data/>');
  t.set('/data/child[1]/age', 10);
  t.set('/data/child[2]/age', 20);
  expect(findAllConcrete(t, '/data/child/age'))
    .toEqual(['/data/child[1]/age','/data/child[2]/age']);
});

test('findAllConcrete returns nodeset itself when no repeats', () => {
  const t = new InstanceTree('<data/>');
  t.set('/data/a', 5);
  expect(findAllConcrete(t, '/data/a')).toEqual(['/data/a']);
});
