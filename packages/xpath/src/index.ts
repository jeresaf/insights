export interface XPathContext {
  /** Absolute or context-resolved getter. Paths like '/data/age' or './age' */
  getValue: (absOrRelPath: string) => any;
  currentRef?: string;
  functions?: Record<string, (...args: any[]) => any>;
}

const BOOL_TRUE = /^true\(\)$/;
const BOOL_FALSE = /^false\(\)$/;

function trimParens(s: string): string {
  s = s.trim();
  if (s.startsWith('(') && s.endsWith(')')) return s.slice(1, -1).trim();
  return s;
}

function isQuoted(str: string): boolean {
  return (str.startsWith("'") && str.endsWith("'")) || (str.startsWith('"') && str.endsWith('"'));
}

function unquote(str: string): string {
  if (isQuoted(str)) return str.slice(1, -1);
  return str;
}

function isIdent(tok: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_\-]*$/.test(tok);
}

function getNearestIndexedSegment(path: string): { name: string; index: number } | null {
  if (!path) return null;
  const segs = path.split('/').filter(Boolean); // ["data","child[2]","age"]
  for (let i = segs.length - 1; i >= 0; i--) {
    const m = segs[i].match(/^([A-Za-z_][\w:.-]*)\[(\d+)\]$/);
    if (m) return { name: m[1], index: parseInt(m[2], 10) };
  }
  return null;
}

function joinIndexedPath(namePath: string, groupPath: string, idx: number): string {
  const normName = namePath.trim();
  const normGroup = groupPath.trim();
  if (!normName.startsWith(normGroup)) {
    // fallback: use the last segment name only
    const last = normName.split('/').filter(Boolean).pop() || '';
    return `${normGroup}[${idx}]${last ? '/' + last : ''}`;
  }
  const tail = normName.slice(normGroup.length).replace(/^\/+/, ''); // drop leading slashes
  return `${normGroup}[${idx}]${tail ? '/' + tail : ''}`;
}

function parentOf(absPath: string): string {
  if (!absPath) return '';
  const parts = absPath.split('/').filter(Boolean); // ['data','child[2]','age']
  parts.pop();
  return '/' + parts.join('/');
}

// Helper: turn a raw token into a value only when needed
function materialize(raw: any, ctx: XPathContext): any {
  if (typeof raw !== 'string') return raw;
  const tok = raw as string;
  if (isQuoted(tok)) return unquote(tok);
  if (/^[-]?[0-9]+(\.[0-9]+)?$/.test(tok)) return parseFloat(tok);
  if (tok.startsWith('/') || tok.startsWith('.') || /^[A-Za-z_]/.test(tok)) {
    return resolvePath(ctx, tok);
  }
  return tok;
}


function resolvePath(ctx: XPathContext, path: string): any {
  // Absolute
  if (path.startsWith('/')) return ctx.getValue(path);

  const cur = ctx.currentRef || '';

  // Current node
  if (path === '.') return ctx.getValue(cur);

  // Parent of current
  if (path === '..') return ctx.getValue(parentOf(cur));

  // Child of current: "./child" or bare "child"
  if (path.startsWith('./')) {
    const rest = path.slice(2);
    return ctx.getValue(cur ? `${cur}/${rest}` : `/${rest}`);
  }

  // Parent then child: "../sibling" (and simple chained once)
  if (path.startsWith('../')) {
    const rest = path.slice(3);
    const base = parentOf(cur);
    return ctx.getValue(base ? `${base}/${rest}` : `/${rest}`);
  }

  // Bare name relative to current
  if (/^[A-Za-z_]/.test(path)) {
    return ctx.getValue(cur ? `${cur}/${path}` : `/${path}`);
  }

  // Fallback (kept minimal)
  return ctx.getValue(path);
}

function callFunction(fn: string, args: any[], ctx: XPathContext): any {
  // Evaluate-on-demand helper for functions that truly need to parse expressions (rare)
  const evalArg = (a: any) => {
    if (typeof a !== 'string') return a;
    // If it's clearly an expression token, evaluate; otherwise treat as a literal payload.
    const s = a.trim();
    if (s === '') return s;
    if (s.startsWith("'") || s.startsWith('"') || /^[-]?[0-9]+(\.[0-9]+)?$/.test(s)) {
      // literals: let evaluate() handle quotes/numbers consistently
      return evaluate(s, ctx);
    }
    if (s.startsWith('/') || s.startsWith('.') || /^[A-Za-z_]/.test(s)) {
      return evaluate(s, ctx);
    }
    // plain text payload (e.g., unquoted string already on stack)
    return s;
  };

  // Minimal built-ins used heavily in forms
  if (fn === 'string-length') {
    const v = String(evalArg(args[0]) ?? '');
    return v.length;
  }
  if (fn === 'contains') {
    const s = String(evalArg(args[0]) ?? '');
    const sub = String(evalArg(args[1]) ?? '');
    return s.includes(sub);
  }
  if (fn === 'starts-with') {
    const s = String(evalArg(args[0]) ?? '');
    const sub = String(evalArg(args[1]) ?? '');
    return s.startsWith(sub);
  }
  if (fn === 'ends-with') {
    const s = String(evalArg(args[0]) ?? '');
    const sub = String(evalArg(args[1]) ?? '');
    return s.endsWith(sub);
  }
  if (fn === 'boolean') {
    const v = evalArg(args[0]);
    return !!(Array.isArray(v) ? v.length : v);
  }
  if (fn === 'not') {
    return !evalArg(args[0]);
  }
  if (fn === 'number') {
    const v = evalArg(args[0]);
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isNaN(n) ? floatNaN() : n;
  }
  if (fn === 'int') {
    const n = callFunction('number', [args[0]], ctx);
    return Number.isNaN(n) ? floatNaN() : Math.trunc(n as number);
  }
  if (fn === 'round') {
    const n = callFunction('number', [args[0]], ctx);
    return Number.isNaN(n as number) ? floatNaN() : Math.round(n as number);
  }
  if (fn === 'coalesce') {
    const a = evalArg(args[0]);
    return (a === '' || a === null || a === undefined) ? evalArg(args[1]) : a;
  }
  if (fn === 'if') {
    const cond = !!evalArg(args[0]);
    return cond ? evalArg(args[1]) : evalArg(args[2]);
  }
  if (fn === 'once') {
    // If the current node has a value, return it; otherwise evaluate the arg lazily.
    const curRef = ctx.currentRef;
    const cur = curRef ? ctx.getValue(curRef) : undefined;
    if (cur === '' || cur === null || typeof cur === 'undefined') {
      return evalArg(args[0]);
    }
    return cur;
  }
  if (fn === 'selected') {
    const set = String(evalArg(args[0]) ?? '');
    const token = String(evalArg(args[1]) ?? '');
    return set.split(/\s+/).filter(Boolean).includes(token);
  }
  if (fn === 'count-selected') {
    const set = String(evalArg(args[0]) ?? '');
    return set ? set.split(/\s+/).filter(Boolean).length : 0;
  }
  if (fn === 'selected-at') {
    const set = String(evalArg(args[0]) ?? '');
    const nRaw = evalArg(args[1]);
    const n = typeof nRaw === 'number' ? nRaw : parseFloat(String(nRaw));
    if (!Number.isFinite(n)) return '';
    const arr = set ? set.split(/\s+/).filter(Boolean) : [];
    return (n >= 0 && n < arr.length) ? arr[n] : '';
  }
  if (fn === 'position') {
    // ODK/Javarosa convention: position(..) returns the 1-based index of the
    // current repeat instance. If not in a repeat, return 1.
    const seg = getNearestIndexedSegment(ctx.currentRef || '');
    return seg ? seg.index : 1;
  }

  if (fn === 'indexed-repeat') {
    // MVP: string path args (as in your tests)
    // Signature we’ll support: indexed-repeat(namePath, groupPath, i)
    // Optional deeper nesting can be added later.
    const namePathRaw = evalArg(args[0]); // e.g. '/data/child/age'
    const groupPathRaw = evalArg(args[1]); // e.g. '/data/child'
    const iRaw = evalArg(args[2]); // 1-based index

    const namePath = String(namePathRaw || '');
    const groupPath = String(groupPathRaw || '');
    const i = typeof iRaw === 'number' ? iRaw : parseFloat(String(iRaw));
    if (!Number.isFinite(i)) return '';

    // Turn /data/child/age + /data/child + 2 => /data/child[2]/age
    const concrete = joinIndexedPath(namePath, groupPath, i);
    return resolvePath(ctx, concrete);
  }

  if (ctx.functions && ctx.functions[fn]) {
    return ctx.functions[fn](...args.map(evalArg));
  }
  throw new Error(`XPath function not implemented: ${fn}`);
}

function floatNaN(): number {
  return NaN;
}

function splitTopLevelArgs(s: string): string[] {
  const args: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) {
      args.push(s.slice(start, i).trim());
      start = i + 1;
    }
  }
  const last = s.slice(start).trim();
  if (last) args.push(last);
  return args;
}

function evalBinary(left: any, op: string, right: any): any {
  const num = (v: any) => typeof v === 'number' ? v : parseFloat(String(v));
  switch (op) {
    case '=': return String(left) === String(right);
    case '!=': return String(left) !== String(right);
    case '>': return num(left) > num(right);
    case '>=': return num(left) >= num(right);
    case '<': return num(left) < num(right);
    case '<=': return num(left) <= num(right);
    case 'and': return !!left && !!right;
    case 'or': return !!left || !!right;
    case '+': return num(left) + num(right);
    case '-': return num(left) - num(right);
    case '*': return num(left) * num(right);
    case 'div': return num(left) / num(right);
    case 'mod': return num(left) % num(right);
    default: throw new Error('Unknown operator ' + op);
  }
}

function tokenize(expr: string): string[] {
  // very small tokenizer for operators/parentheses/paths/names/literals
  const tokens: string[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '(' || c === ')' || c === ',') {
      tokens.push(c); i++; continue;
    }
    if (c === "'" || c === '"') {
      const q = c; i++;
      let s = '';
      while (i < expr.length && expr[i] !== q) { s += expr[i++]; }
      if (expr[i] !== q) throw new Error('Unclosed string literal');
      i++; tokens.push(q + s + q); continue;
    }
    // two-char ops
    if ((expr.slice(i).startsWith('>=') || expr.slice(i).startsWith('<=') || expr.slice(i).startsWith('!='))) {
      tokens.push(expr.slice(i, i + 2)); i += 2; continue;
    }
    // one-char ops
    if ('=<>+*-'.includes(c)) { tokens.push(c); i++; continue; }
    // words (and/or/div/mod) or names/paths starting with / . or alpha _
    if (c === '/' || c === '.' || /[A-Za-z_]/.test(c)) {
      let s = c; i++;
      while (i < expr.length && /[A-Za-z0-9_:\/\.\-]/.test(expr[i])) { s += expr[i++]; }
      tokens.push(s); continue;
    }
    // numbers
    if (/[0-9]/.test(c)) {
      let s = c; i++;
      while (i < expr.length && /[0-9\.]/.test(expr[i])) { s += expr[i++]; }
      tokens.push(s); continue;
    }
    throw new Error('Unexpected char in XPath: ' + c);
  }
  return tokens;
}

// Shunting-yard to RPN, then eval – handles binary ops and function calls
const PRECEDENCE: Record<string, number> = {
  'or': 1, 'and': 2,
  '=': 3, '!=': 3, '>': 3, '>=': 3, '<': 3, '<=': 3,
  '+': 4, '-': 4,
  '*': 5, 'div': 5, 'mod': 5
};

export function evaluate(expr: string, ctx: XPathContext): any {
  expr = expr.trim();
  if (BOOL_TRUE.test(expr)) return true;
  if (BOOL_FALSE.test(expr)) return false;
  // If the whole expr is just a string or number literal
  if ((expr.startsWith("'") && expr.endsWith("'")) || (expr.startsWith('"') && expr.endsWith('"'))) {
    return unquote(expr);
  }
  if (/^[-]?[0-9]+(\.[0-9]+)?$/.test(expr)) return parseFloat(expr);

  const tokens = tokenize(expr);
  const output: (string | any[])[] = [];
  const ops: string[] = [];
  const funcStack: string[] = [];
  const argCount: number[] = [];

  let i = 0;
  let pendingFn: string | null = null; // ⬅️ new

  while (i < tokens.length) {
    const t = tokens[i];

    if (t === '(') {
      // If we had an identifier immediately before and we deliberately
      // didn't emit it, this is a function call start.
      if (pendingFn) {
        funcStack.push(pendingFn);
        argCount.push(0);
        pendingFn = null;
      }
      ops.push(t);
      i++;
      continue;
    }

    if (t === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') output.push(ops.pop() as string);
      ops.pop(); // pop '('
      // If there is a function pending, pop it too and emit a call node
      if (funcStack.length) {
        const fn = funcStack.pop() as string;
        const argc = (argCount.pop() as number) + 1; // commas + 1 arg
        output.push([fn, argc]);
      }
      i++;
      continue;
    }

    if (t === ',') {
      while (ops.length && ops[ops.length - 1] !== '(') output.push(ops.pop() as string);
      if (argCount.length) argCount[argCount.length - 1]++;
      i++;
      continue;
    }

    if (t in PRECEDENCE) {
      while (ops.length && (ops[ops.length - 1] in PRECEDENCE) &&
        (PRECEDENCE[ops[ops.length - 1]] >= PRECEDENCE[t])) {
        output.push(ops.pop() as string);
      }
      ops.push(t);
      i++;
      continue;
    }

    // If identifier and next token is "(", mark as function name and DO NOT emit now.
    if (/^[A-Za-z_]/.test(t) && tokens[i + 1] === '(') {
      pendingFn = t; // stash; '(' will consume it as a function
      i++;
      continue;
    }

    // Otherwise operand: literal, path, bare name
    output.push(t);
    i++;
  }

  while (ops.length) output.push(ops.pop() as string);

  // evaluate RPN
  const stack: any[] = [];
  for (const item of output) {
    if (Array.isArray(item)) {
      // Function call node: [fn, argc]; args remain raw tokens so functions can lazily evaluate them.
      const [fn, argc] = item as [string, number];
      const args: any[] = [];
      for (let k = 0; k < argc; k++) args.unshift(stack.pop());
      const res = callFunction(fn as string, args as any, ctx); // args are raw; functions can evaluate as needed
      stack.push(res);
    } else if (item in PRECEDENCE) {
      // Binary operator: materialize operands now
      const bRaw = stack.pop(); const aRaw = stack.pop();
      const a = materialize(aRaw, ctx);
      const b = materialize(bRaw, ctx);
      stack.push(evalBinary(a, item as string, b));
    } else {
      // Push raw token; do not evaluate now (lets functions like once(), selected-at be lazy)
      stack.push(item);
    }
  }

  if (stack.length !== 1) throw new Error('XPath evaluation error');
  const result = stack[0];
  // If the result is a bare path/name token, resolve it now
  if (typeof result === 'string') {
    const s = result.trim();
    if (s.startsWith('/') || s === '.' || s === '..' || s.startsWith('./') || s.startsWith('../')) {
      return resolvePath(ctx, s);
    }
  }
  return result;

}