import { InstanceTree } from '../src/instance/Tree';
import { describe, test, expect } from 'vitest';

describe('InstanceTree indexed paths', () => {
  test('get/set with [n] indices', () => {
    const t = new InstanceTree('<data/>');
    t.set('/data/child[1]/age', 10);
    t.set('/data/child[2]/age', 20);
    expect(t.get('/data/child[1]/age')).toBe(10);
    expect(t.get('/data/child[2]/age')).toBe(20);

    t.set('/data/child[2]/age', 21);
    expect(t.get('/data/child[2]/age')).toBe(21);
  });
});
