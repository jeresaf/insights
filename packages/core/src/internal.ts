import type { Value } from './types';

export type EvaluateCtx = { ref?: string };
export type EvaluateFn = (expr: string, ctx?: EvaluateCtx) => any;
export type GetValueFn = (path: string) => Value;

export interface FlagsStore {
  relevant: Map<string, boolean>;
  required: Map<string, boolean>;
  constraintOk: Map<string, boolean>;
}