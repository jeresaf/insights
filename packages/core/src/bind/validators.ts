import type { Bind } from '../types';
import type { EvaluateFn, GetValueFn } from '../internal';
import { rewriteDots } from './rewrite';

export interface Validity {
  required: boolean;
  requiredError: boolean;
  constraint: boolean; // expression result when present, else true
  constraintError: boolean;
}

export function computeRequired(bind: Bind, evalFn: EvaluateFn, ref: string): boolean {
  // absent or empty means "not required"
  if (!bind.required || String(bind.required).trim() === '') return false;
  try {
    return !!evalFn(bind.required, { ref });
  } catch {
    // Spec: if required expression errors, treat as not required
    return false;
  }
}

export function computeConstraint(bind: Bind, evalFn: EvaluateFn, ref: string): boolean {
  // absent or empty means "constraint ok"
  if (!bind.constraint || String(bind.constraint).trim() === '') return true;
  try {
    // Constraint expression is boolean; true => OK, false => invalid
    return !!evalFn(bind.constraint, { ref });
  } catch {
    // Be conservative: on error, consider it OK to avoid blocking entry
    return true;
  }
}