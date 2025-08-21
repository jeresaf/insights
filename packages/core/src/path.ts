// packages/core/src/path.ts
export function stripIndices(path: string): string {
  return path.replace(/\[\d+\]/g, '');
}

export function matchesNodeset(nodeset: string, concrete: string): boolean {
  return stripIndices(concrete) === nodeset;
}

// split absolute path into segments, preserving any [n]
export function splitPath(p: string): string[] {
  if (!p || p[0] !== '/') throw new Error(`Absolute path required: ${p}`);
  return p.split('/').filter(Boolean);
}
