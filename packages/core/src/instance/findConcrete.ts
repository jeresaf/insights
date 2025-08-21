// packages/core/src/instance/findConcrete.ts
import { InstanceTree } from './Tree';

type Seg = { name: string; index?: number };

function parsePath(p: string): Seg[] {
  if (!p || p[0] !== '/') throw new Error(`findAllConcrete: path must be absolute: ${p}`);
  const parts = p.split('/').filter(Boolean);
  return parts.map(seg => {
    const m = seg.match(/^([A-Za-z_][\w:.-]*)(?:\[(\d+)\])?$/);
    if (!m) throw new Error(`findAllConcrete: bad segment: ${seg}`);
    return { name: m[1], index: m[2] ? parseInt(m[2], 10) : undefined };
  });
}

function joinAbs(base: string, seg: string): string {
  // ensure single leading slash, no double slashes when concatenating
  const b = base.replace(/\/+$/, '');
  const s = seg.replace(/^\/+/, '');
  return `/${[b.replace(/^\//, ''), s].filter(Boolean).join('/')}`;
}

/**
 * Expand a (possibly repeated) nodeset into concrete absolute paths.
 * If no repeats, returns the nodeset itself.
 * Examples:
 *   '/data/a' -> ['/data/a']
 *   '/data/child/age' with 2 rows -> ['/data/child[1]/age','/data/child[2]/age']
 */
export function findAllConcrete(tree: InstanceTree, nodeset: string): string[] {
  const segs = parsePath(nodeset);

  // paths is a list of concrete prefixes we are building; start at '/data' root
  let paths: string[] = ['/'];

  // Walk segments, branching whenever we hit a repeat segment without an explicit index.
  for (let i = 0; i < segs.length; i++) {
    const { name, index } = segs[i];
    const next: string[] = [];

    for (const p of paths) {
      if (index != null) {
        // explicit index -> single concrete branch
        next.push(joinAbs(p, `${name}[${index}]`));
      } else {
        // unknown if repeat; ask tree for existing indices
        const existing = tree.enumerateRepeat(p === '/' ? '/data' : p, name);
        if (existing.length > 0) {
          // branch across all concrete instances
          for (const idx of existing) {
            next.push(joinAbs(p, `${name}[${idx}]`));
          }
        } else {
          // not a repeat (or no instances yet) -> keep as a single, unindexed segment
          next.push(joinAbs(p, name));
        }
      }
    }

    paths = next;
  }

  // If no repeats were present (no [n] introduced), return the original nodeset
  const introducedIndex = paths.some(p => /\[\d+\]/.test(p));
  if (!introducedIndex) return [nodeset];

  return paths;
}
