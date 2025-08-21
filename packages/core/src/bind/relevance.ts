import type { Bind } from '../types';
import type { EvaluateFn } from '../internal';

export function computeRelevant(bind: Bind, evalFn: EvaluateFn, ref: string): boolean {
  // absent or empty means "relevant" (visible)
  if (!bind.relevant || String(bind.relevant).trim() === '') return true;
  try {
    return !!evalFn(bind.relevant, { ref });
  } catch {
    // On error, default to visible to avoid hiding fields unintentionally
    return true;
  }
}