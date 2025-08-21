// packages/core/src/instance/Tree.ts
// Minimal instance tree with support for repeat arrays and [n] addressing.

export type Node = Record<string, any> | any[] | string | number | boolean | null;

type Seg = { name: string; index?: number };

// Parse absolute path like "/data/child[2]/age"
function parsePath(p: string): Seg[] {
  if (!p || p[0] !== '/') throw new Error(`InstanceTree: path must be absolute: ${p}`);
  const parts = p.split('/').filter(Boolean);
  return parts.map(seg => {
    const m = seg.match(/^([A-Za-z_][\w:.-]*)(?:\[(\d+)\])?$/);
    if (!m) throw new Error(`InstanceTree: bad segment: ${seg}`);
    return { name: m[1], index: m[2] ? parseInt(m[2], 10) : undefined };
  });
}

function ensureObj(o: any, key: string) {
  if (o[key] == null || typeof o[key] !== 'object' || Array.isArray(o[key])) {
    o[key] = {};
  }
  return o[key];
}

function ensureArr(o: any, key: string) {
  if (!Array.isArray(o[key])) o[key] = [];
  return o[key] as any[];
}

export class InstanceTree {
  private root: any;

  constructor(initialXml: string | null | undefined) {
    // MVP: initialize an empty root with a /data object so structural
    // queries like exists('/data') pass immediately.
    // (You can replace this with your real XML loader later.)
    this.root = {};
    ensureObj(this.root, 'data');
  }

  /** Return the (mutable) node object for a concrete absolute path, or undefined if missing */
  private _getNode(path: string): any | undefined {
    const segs = parsePath(path);
    let cur: any = this.root;
    for (const seg of segs) {
      const bucket = cur[seg.name];
      if (Array.isArray(bucket)) {
        const i = (seg.index ?? 1) - 1;
        if (i < 0 || i >= bucket.length) return undefined;
        cur = bucket[i];
      } else {
        if (bucket === undefined) return undefined;
        if (seg.index != null) return undefined; // indexed access on non-repeat
        cur = bucket;
      }
    }
    return cur;
  }

  /** Return [1..N] for repeat instances under parentAbs with name segName */
  enumerateRepeat(parentPath: string, groupName: string): number[] {
    const parent = this._getNode(parentPath);
    if (!parent || typeof parent !== 'object') return [];
    const bucket = parent[groupName];
    if (!Array.isArray(bucket)) return [];
    return bucket.map((_, i) => i + 1);
  }

  /** Structural existence (independent of node's value) */
  exists(absPath: string): boolean {
    const segs = parsePath(absPath);
    let node: any = this.root;

    for (const seg of segs) {
      const child = node[seg.name];

      if (Array.isArray(child)) {
        // Repeat segment must have an in-bounds 1-based index
        const idx = (seg.index ?? 0);
        if (idx < 1 || idx > child.length) return false;
        node = child[idx - 1];
        continue;
      }

      if (child === undefined) return false;

      if (seg.index != null) {
        // Asking for [n] on a non-repeat
        return false;
      }

      node = child;
    }
    return true;
  }

  /** Absolute path getter. Supports [n] 1-indexed on repeat segments. */
  get(absPath: string): any {
    const segs = parsePath(absPath);
    let node: any = this.root;

    for (const { name, index } of segs) {
      const child = node[name];

      if (Array.isArray(child)) {
        const arr = child as any[];
        const idx = (index ?? 1) - 1;
        if (idx < 0 || idx >= arr.length) return undefined;
        node = arr[idx];
        continue;
      }

      if (index != null) {
        // Index requested but not an array
        return undefined;
      }

      node = child;
      if (node === undefined) return undefined;
    }

    return node;
  }

  /** Absolute path setter. Creates arrays/objects as needed. */
  set(absPath: string, value: any): void {
    const segs = parsePath(absPath);
    let node: any = this.root;

    for (let i = 0; i < segs.length; i++) {
      const last = i === segs.length - 1;
      const { name, index } = segs[i];

      if (index != null) {
        // Ensure array exists for repeat segment
        const arr = ensureArr(node, name);
        const idx = index - 1;
        while (arr.length <= idx) arr.push({});
        if (last) {
          arr[idx] = value;
        } else {
          if (arr[idx] == null || typeof arr[idx] !== 'object' || Array.isArray(arr[idx])) {
            arr[idx] = {};
          }
          node = arr[idx];
        }
      } else {
        // Non-indexed segment
        if (Array.isArray(node[name])) {
          // Default to first instance when omitted
          const arr = node[name] as any[];
          if (arr.length === 0) arr.push({});
          if (last) {
            arr[0] = value;
          } else {
            if (arr[0] == null || typeof arr[0] !== 'object' || Array.isArray(arr[0])) {
              arr[0] = {};
            }
            node = arr[0];
          }
        } else {
          if (last) {
            node[name] = value;
          } else {
            node = ensureObj(node, name);
          }
        }
      }
    }
  }

  /** Return root absolute path; MVP keeps '/data' convention. */
  getRootPath(): string {
    return '/data';
  }

  /** Append a new empty object as the next repeat instance. Returns concrete base path e.g. '/data/child[3]'. */
  appendRepeat(groupPath: string): string {
    const segs = parsePath(groupPath);

    // Walk to parent of the repeat segment
    let node: any = this.root;
    for (let i = 0; i < segs.length - 1; i++) {
      const { name, index } = segs[i];
      if (index != null) {
        const arr = ensureArr(node, name);
        const idx = index - 1;
        while (arr.length <= idx) arr.push({});
        node = arr[idx];
      } else {
        node = ensureObj(node, name);
      }
    }

    const { name } = segs[segs.length - 1];
    const arr = ensureArr(node, name);
    arr.push({});
    const idx = arr.length; // 1-based
    return `${groupPath}[${idx}]`;
  }

  /** Remove the idx-th (1-based) repeat instance under groupPath. */
  removeRepeat(groupPath: string, index: number): void {
    const segs = parsePath(groupPath);
    let node: any = this.root;
    for (let i = 0; i < segs.length - 1; i++) {
      const { name, index: idx } = segs[i];
      if (idx != null) {
        const arr = ensureArr(node, name);
        const j = idx - 1;
        while (arr.length <= j) arr.push({});
        node = arr[j];
      } else {
        node = ensureObj(node, name);
      }
    }
    const { name } = segs[segs.length - 1];
    const arr = ensureArr(node, name);
    // Be tolerant: index 0 means "first"
    const j = Math.max(1, index) - 1;
    if (j >= 0 && j < arr.length) arr.splice(j, 1);
  }

  /** Serialize to XML (stub for MVP). */
  serialize(): string {
    // Placeholder; plug in your real serializer when ready.
    return '<data/>';
  }
}
