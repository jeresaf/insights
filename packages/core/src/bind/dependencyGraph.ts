import type { Bind } from '../types';

export type Edge = {
  from: string;
  to: string;
  kind: 'relevant' | 'required' | 'constraint' | 'calculate';
};

const PATH_RX = /(\/[A-Za-z_][\w:.-]*(?:\/[A-Za-z_][\w:.-]*)*)/g;

function refsFromExpr(expr?: string | null): string[] {
  if (!expr) return [];
  const refs = new Set<string>();
  for (const m of expr.matchAll(PATH_RX)) refs.add((m as any)[1] as string);
  return Array.from(refs);
}

function hasDotRef(expr?: string | null): boolean {
  if (!expr) return false;
  // naive scanner: find '.' outside quotes
  let inS = false, inD = false;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === "'" && !inD) { inS = !inS; continue; }
    if (c === '"' && !inS) { inD = !inD; continue; }
    if (!inS && !inD && c === '.') return true;
  }
  return false;
}

export interface DepGraph {
  edges: Edge[];
  bySource: Map<string, Edge[]>;
  byTarget: Map<string, Edge[]>;
  targetDependsOn: Map<string, Set<string>>;
}

export function buildDepGraph(binds: Bind[]): DepGraph {
  const edges: Edge[] = [];
  const bySource = new Map<string, Edge[]>();
  const byTarget = new Map<string, Edge[]>();
  const targetDependsOn = new Map<string, Set<string>>();

  const addEdge = (from: string, to: string, kind: Edge['kind']) => {
    const e: Edge = { from, to, kind };
    edges.push(e);
    if (!bySource.has(from)) bySource.set(from, []);
    if (!byTarget.has(to)) byTarget.set(to, []);
    bySource.get(from)!.push(e);
    byTarget.get(to)!.push(e);
    if (!targetDependsOn.has(to)) targetDependsOn.set(to, new Set());
    targetDependsOn.get(to)!.add(from);
  };

  for (const b of binds) {
    const target = b.ref;
    for (const r of refsFromExpr(b.relevant)) addEdge(r, target, 'relevant');
    for (const r of refsFromExpr(b.required)) addEdge(r, target, 'required');
    for (const r of refsFromExpr(b.constraint)) addEdge(r, target, 'constraint');
    for (const r of refsFromExpr(b.calculate)) addEdge(r, target, 'calculate');
    // self-edge when expression uses '.' so that changing the node triggers its own recompute
    if (hasDotRef(b.constraint)) addEdge(target, target, 'constraint');
    if (hasDotRef(b.relevant)) addEdge(target, target, 'relevant');
    if (hasDotRef(b.required)) addEdge(target, target, 'required');
    if (hasDotRef(b.calculate)) addEdge(target, target, 'calculate');
  }

  return { edges, bySource, byTarget, targetDependsOn };
}

/** Topo sort for a provided set of targets using target->target edges */
function topoAmongTargets(targets: string[], graph: DepGraph): string[] {
  const targetSet = new Set(targets);
  const indeg = new Map<string, number>(targets.map(t => [t, 0]));
  const outgoing = new Map<string, Set<string>>(targets.map(t => [t, new Set()]));
  for (const t of targets) {
    const deps = graph.targetDependsOn.get(t) || new Set<string>();
    for (const dep of deps) {
      if (targetSet.has(dep)) {
        outgoing.get(dep)!.add(t);
        indeg.set(t, (indeg.get(t) ?? 0) + 1);
      }
    }
  }
  const q: string[] = targets.filter(t => (indeg.get(t) ?? 0) === 0);
  const order: string[] = [];
  const seen = new Set<string>();
  while (q.length) {
    const t = q.shift() as string;
    if (seen.has(t)) continue;
    seen.add(t);
    order.push(t);
    for (const nxt of outgoing.get(t) || new Set<string>()) {
      indeg.set(nxt, (indeg.get(nxt) ?? 0) - 1);
      if ((indeg.get(nxt) ?? 0) === 0) q.push(nxt);
    }
  }
  if (order.length !== targets.length) return targets;
  return order;
}

/**
 * Return affected targets in topological order based on changes.
 * Traverses dependents transitively (BFS).
 */
export function planAffectedTargets(changed: Set<string>, graph: DepGraph): string[] {
  const queue: string[] = Array.from(changed);
  const visitedSources = new Set<string>(queue);
  const affected = new Set<string>();
  while (queue.length) {
    const src = queue.shift() as string;
    for (const e of graph.bySource.get(src) || []) {
      if (!affected.has(e.to)) affected.add(e.to);
      if (!visitedSources.has(e.to)) {
        visitedSources.add(e.to);
        queue.push(e.to);
      }
    }
  }
  const targets = Array.from(affected);
  if (targets.length === 0) return [];
  return topoAmongTargets(targets, graph);
}

/** Topologically order all bind targets (for initial full recompute). */
// packages/core/src/bind/dependencyGraph.ts
export function planAllTargets(graph: DepGraph, binds: Bind[]): string[] {
  // topo over all bind targets
  const targets = Array.from(new Set(binds.map(b => b.ref)));
  const targetSet = new Set(targets);
  const indeg = new Map<string, number>(targets.map(t => [t, 0]));
  const outgoing = new Map<string, Set<string>>(targets.map(t => [t, new Set()]));

  for (const t of targets) {
    const deps = graph.targetDependsOn.get(t) || new Set<string>();
    for (const dep of deps) {
      if (targetSet.has(dep)) {
        outgoing.get(dep)!.add(t);
        indeg.set(t, (indeg.get(t) ?? 0) + 1);
      }
    }
  }

  const q: string[] = targets.filter(t => (indeg.get(t) ?? 0) === 0);
  const order: string[] = [];
  const seen = new Set<string>();
  while (q.length) {
    const t = q.shift()!;
    if (seen.has(t)) continue;
    seen.add(t);
    order.push(t);
    for (const nxt of outgoing.get(t) || new Set<string>()) {
      indeg.set(nxt, (indeg.get(nxt) ?? 0) - 1);
      if ((indeg.get(nxt) ?? 0) === 0) q.push(nxt);
    }
  }
  return order.length === targets.length ? order : targets;
}

