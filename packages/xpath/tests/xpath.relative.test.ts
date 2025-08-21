// tests/xpath.relative.test.ts
import { evaluate, XPathContext } from '@javarosa-js/xpath';
import { test, expect } from 'vitest';

const store: Record<string, any> = {
  '/data/child[2]/age': 11,
  '/data/child[2]': {}, // parent exists
  '/data/child[1]/age': 9,
};

const ctx: XPathContext = {
  currentRef: '/data/child[2]/age',
  getValue: (p) => store[p],
};

test('dot resolves to current node', () => {
  expect(evaluate('. <= 10', ctx)).toBe(false);
});

test('parent resolves with ..', () => {
  expect(() => evaluate('..', ctx)).not.toThrow();
});
