// Replace '.' occurrences that refer to the current node with its absolute path.
// This is a simplistic approach for MVP and covers common patterns: '.', './', '[.]', '(.', ' .', '= .', etc.
export function rewriteDots(expr: string, currentPath: string): string {
  // Replace standalone '.' tokens with currentPath. Keep inside quotes intact (basic).
  let out = '';
  let inS = false, inD = false;
  for (let i=0; i<expr.length; i++) {
    const c = expr[i];
    if (c === "'" && !inD) inS = !inS;
    if (c === '"' && !inS) inD = !inD;
    if (!inS && !inD) {
      // detect '.' token boundaries
      if (c === '.' ) {
        const prev = i>0 ? expr[i-1] : ' ';
        const next = i+1<expr.length ? expr[i+1] : ' ';
        const isWordPrev = /[A-Za-z0-9_\/]$/.test(prev);
        const isWordNext = /^[A-Za-z0-9_\/] /.test(next) || next === ')' || next === ']' || next === ' ' ;
        if (!isWordPrev) {
          // treat as current node reference
          out += currentPath;
          continue;
        }
      }
    }
    out += c;
  }
  return out;
}