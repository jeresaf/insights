import { evaluate, XPathContext } from '@javarosa-js/xpath';
import { test, expect } from 'vitest';

test('dot resolves to current node value', () => {
  const store: Record<string, any> = { '/data/x': 11 };
  const ctx: XPathContext = {
    currentRef: '/data/x',
    getValue: (p) => store[p],
  };
  expect(evaluate('. <= 10', ctx)).toBe(false);
});