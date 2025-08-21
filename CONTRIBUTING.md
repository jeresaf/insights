
---

# 2) Contributing guide

**`CONTRIBUTING.md`**
```md
# Contributing

## Dev
- `pnpm i`
- `pnpm -r build`
- `pnpm -r test`

## Project rules
- Keep `@javarosa-js/xpath` free of form types (pure evaluator).
- Public API is defined by package READMEs and `.d.ts` emitted from `src/index.ts`.
- Internal utilities must be annotated with `/** @internal */` and excluded via `stripInternal`.

## PR checklist
- [ ] Unit tests updated/added
- [ ] No changes to public API without a changeset
- [ ] `pnpm -r build` + `pnpm -r test` green
- [ ] README updated if user‑visible behavior changes
