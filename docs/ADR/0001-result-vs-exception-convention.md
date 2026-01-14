# ADR-0001: Result vs Exception Convention

- **Status:** Accepted
- **Date:** 2025-01-08
- **Deciders:** @couimet

## Context

RangeLink uses functional error handling with `Result<T, E>` types (inherited from `rangelink-core-ts`). We needed a clear rule for when to use `Result` vs traditional try/catch.

## Decision

**Inner code returns `Result`. Outer code catches exceptions.**

```text
┌─────────────────────────────────────────────────────────────┐
│ Outer Shell (Commands, extension.ts)                        │
│   - try/catch for unexpected failures (VSCode API, etc.)    │
│   - Unwraps Result types from inner layers                  │
│   - The ONLY place that throws/catches                      │
├─────────────────────────────────────────────────────────────┤
│ Inner Core (Services, Stores, Utils)                        │
│   - Returns Result<T, E> everywhere                         │
│   - Never throws                                            │
│   - Pure, composable, testable                              │
└─────────────────────────────────────────────────────────────┘
```

### The Rule

**If you're not a command or `extension.ts`, return `Result` — don't throw.**

### Error Categories

| Category              | Handling       | Example                               |
| --------------------- | -------------- | ------------------------------------- |
| **Expected errors**   | `Result.err()` | Bookmark not found, validation failed |
| **Unexpected errors** | try/catch      | VSCode API crashed, network failure   |

## Consequences

### Positive

- **One simple rule** — Easy to remember and enforce
- **Services compose cleanly** — No try/catch boilerplate when services call each other
- **Better testing** — Assert on Result values, no exception catching in tests

### Negative

- **Commands are slightly verbose** — Must unwrap Result AND have try/catch for unexpected errors

## References

- [Railway Oriented Programming](https://fsharpforfunandprofit.com/rop/) — Scott Wlaschin
  - [Against Railway Oriented Programming](https://fsharpforfunandprofit.com/posts/against-railway-oriented-programming/) — nuances from the same author

## Further Reading

- [Hexagonal Architecture: There Are Always Two Sides to Every Story](https://medium.com/ssense-tech/hexagonal-architecture-there-are-always-two-sides-to-every-story-bc0780ed7d9c) — [Pablo Martinez](https://medium.com/@pablomtzn)
