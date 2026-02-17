/**
 * Whether an entity (file, terminal) is the currently bound paste destination.
 * String union instead of boolean — both values are truthy, forcing explicit
 * `=== 'bound'` checks and avoiding JavaScript's falsy trap where `false`
 * and `undefined` are indistinguishable in conditionals and sort comparisons.
 *
 * - `'bound'` — this entity is the bound paste destination
 * - `'not-bound'` — explicitly not the bound entity
 * - `undefined` (absent) — not yet enriched by a mark* function
 */
export type BoundState = 'bound' | 'not-bound';
