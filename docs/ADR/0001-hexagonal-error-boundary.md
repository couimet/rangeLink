# ADR-0001: Hexagonal Error Boundary

- **Status:** Accepted
- **Date:** 2025-01-08
- **Deciders:** @couimet

## Context

RangeLink uses functional error handling with `Result<T, E>` types. The question arose: where should the boundary be between functional `Result` types and imperative try/catch?

### Options Considered

1. **Exceptions everywhere** — Abandon functional error handling
2. **Service boundary** — Services throw, commands catch
3. **Hexagonal boundary** — Only the outer shell (commands, extension.ts) uses try/catch

## Decision

Option 3: Hexagonal boundary.

Following hexagonal architecture principles, the boundary is at the **outer shell** — commands and `extension.ts` activation code. Everything inside uses functional `Result<T, E>` types.

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

**If you're not a command or `extension.ts` activation code, you return `Result` — you do not throw.**

### Error Categories

| Category              | Handling       | Example                               |
| --------------------- | -------------- | ------------------------------------- |
| **Expected errors**   | `Result.err()` | Bookmark not found, validation failed |
| **Unexpected errors** | try/catch      | VSCode API crashed, network failure   |

## Consequences

### Positive

- **One simple rule** — "Inner = Result, Outer = try/catch"
- **Services can compose** — Service A calling Service B doesn't need try/catch
- **Expected vs unexpected** — Clear separation of error types
- **Better testing** — Service tests assert on Result, no exception catching
- **No information loss** — `Result.err` preserves structured error context

### Negative

- **Slightly more verbose in commands** — Must unwrap Result AND have try/catch
- **Two patterns in commands** — Result unwrapping for expected, catch for unexpected

### Neutral

- **Consistent with core library** — `rangelink-core-ts` already uses Result types

## Notes

This pattern aligns with:

- **Hexagonal architecture** — Impure shell, pure core
- **Functional core, imperative shell** — Gary Bernhardt's pattern
- **Railway-oriented programming** — Scott Wlaschin's approach

## References

- [Hexagonal Architecture: There Are Always Two Sides to Every Story](https://medium.com/ssense-tech/hexagonal-architecture-there-are-always-two-sides-to-every-story-bc0780ed7d9c) — [Pablo Martinez](https://medium.com/@pablomtzn)
- [Boundaries](https://www.destroyallsoftware.com/talks/boundaries) — Gary Bernhardt (SCNA 2012)
- [Railway Oriented Programming](https://fsharpforfunandprofit.com/rop/) — Scott Wlaschin
