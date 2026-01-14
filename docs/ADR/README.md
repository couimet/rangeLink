# Architecture Decision Records (ADR)

This directory contains architectural decision records documenting the "why" behind major design choices in RangeLink.

## What are ADRs?

Architecture Decision Records (ADRs) capture important architectural decisions along with their context and consequences. They help:

- **Onboard new contributors** - Understand why things are the way they are
- **Prevent re-litigation** - Avoid revisiting decisions already made
- **Document trade-offs** - Preserve the reasoning behind choices

## Format

We follow the format from [adr.github.io](https://adr.github.io/):

- **Status:** Accepted / Deprecated / Superseded
- **Context:** What's the situation and problem?
- **Decision:** What did we decide to do?
- **Consequences:** What are the trade-offs and implications?

## ADRs

| #                                                | Title                          | Status   |
| ------------------------------------------------ | ------------------------------ | -------- |
| [0001](./0001-result-vs-exception-convention.md) | Result vs Exception Convention | Accepted |

## Future ADRs

Decisions we may document:

- Monorepo structure
- Independent package versioning
- Git tagging convention (`{package}-v{version}`)
- Core library extraction (platform-agnostic)
