import { evaluate } from '../src/index';
import { test, expect } from 'vitest';

const ctx = {
  currentRef: '/data',
  getValue: (_p: string) => '', // not used
};

test('selected-at returns item or empty string', () => {
  expect(evaluate(`selected-at('a b c', 0)`, ctx as any)).toBe('a');
  expect(evaluate(`selected-at('a b c', 2)`, ctx as any)).toBe('c');
  expect(evaluate(`selected-at('a b c', 3)`, ctx as any)).toBe('');
  expect(evaluate(`selected-at('', 0)`, ctx as any)).toBe('');
});
