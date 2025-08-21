// packages/core/src/index.ts
import type { FormModel as IFormModel, FormSession as IFormSession, Value } from './types';
import { loadXFormToModel } from './model/FormModel';
import { InstanceTree } from './instance/Tree';
import { evaluate as evalXPath, XPathContext } from '@javarosa-js/xpath';
import type { FlagsStore } from './internal';
import { recalcForPaths, prepareGraph, recalcAll } from './eval/scheduler';

export function loadXForm(xml: string): IFormModel {
  return loadXFormToModel(xml);
}

export function createFormSession(model: IFormModel, opts?: { lang?: string }): IFormSession {
  const tree = new InstanceTree(model.initialInstanceXml);

  // 1) Define context FIRST so any evaluators can safely capture it
  const ctx: XPathContext = {
    currentRef: tree.getRootPath(),
    getValue: (p: string) => tree.get(p),
  };

  // 2) Helper evaluator that always uses the shared ctx
  function sessionEvaluate(expr: string, opt?: { ref?: string }) {
    if (opt?.ref) ctx.currentRef = opt.ref;
    return evalXPath(expr, ctx);
  }

  // 3) Rest of session bootstrapping
  const setCalculated = (p: string, v: Value) => { tree.set(p, v); };
  let lang = opts?.lang || 'default';

  const listeners: Record<string, Set<(...args: any[]) => void>> = {
    change: new Set(),
    recalc: new Set(),
    language: new Set(),
  };

  const flags: FlagsStore = { relevant: new Map(), required: new Map(), constraintOk: new Map() };
  const graph = prepareGraph(model.binds);

  // 4) Initial full recompute: pass a closure that uses sessionEvaluate (no direct ctx)
  recalcAll(model.binds, flags, (e, c) => sessionEvaluate(e, c), graph, setCalculated, tree);

  function emit(ev: 'change' | 'recalc' | 'language', ...args: any[]) {
    listeners[ev].forEach(cb => cb(...args));
  }

  // 5) Build the session object without any cyclical reference in evaluators
  const session: IFormSession = {
    getValue: (path: string) => tree.get(path),

    setValue: (path: string, value: Value) => {
      tree.set(path, value);
      emit('change', path, value);
      // Use sessionEvaluate so DTS doesn’t need to see ctx here
      recalcForPaths([path], model.binds, flags, (e, c) => session.evaluate(e, c), graph, setCalculated, tree);
      emit('recalc');
    },

    evaluate: (expr: string, _ctx?: { ref?: string }) => sessionEvaluate(expr, _ctx),

    isRelevant: (path: string) => flags.relevant.get(path) ?? true,
    isRequired: (path: string) => flags.required.get(path) ?? false,

    isValid: (path?: string) => {
      const isFilled = (v: any) => !(v === null || v === undefined || v === '');
      if (path) {
        const constraintOk = flags.constraintOk.get(path);
        const required = flags.required.get(path);
        const v = session.getValue(path);
        const reqOk = !required || isFilled(v);
        return (constraintOk ?? true) && reqOk;
      }
      // whole form
      for (const [p, req] of flags.required) {
        if (req && !isFilled(session.getValue(p))) return false;
      }
      for (const [, ok] of flags.constraintOk) {
        if (ok === false) return false;
      }
      return true;
    },

    serialize: () => tree.serialize(),

    setLanguage: (code: string) => { lang = code; emit('language', code); },

    on: (event, cb) => { listeners[event].add(cb); return () => listeners[event].delete(cb); },

    addRepeat: (groupPath: string) => {
      const concrete = tree.appendRepeat(groupPath);
      recalcForPaths([groupPath], model.binds, flags, (e, c) => session.evaluate(e, c), graph, setCalculated, tree);
      emit('recalc');
      return concrete;
    },

    deleteRepeat: (groupPath: string, index: number) => {
      tree.removeRepeat(groupPath, index);
      recalcForPaths([groupPath], model.binds, flags, (e, c) => session.evaluate(e, c), graph, setCalculated, tree);
      emit('recalc');
    },
  };

  return session;
}

export * from './types';
