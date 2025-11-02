# Architecture Decision Records (ADR)

> **Coming Soon** - This directory will contain architectural decision records documenting the "why" behind major design choices in RangeLink.

## What are ADRs?

Architecture Decision Records (ADRs) capture important architectural decisions along with their context and consequences. They help:

- **Onboard new contributors** - Understand why things are the way they are
- **Prevent re-litigation** - Avoid revisiting decisions already made
- **Document trade-offs** - Preserve the reasoning behind choices

## Format

We'll follow the format from [adr.github.io](https://adr.github.io/):

- **Status:** Accepted / Deprecated / Superseded
- **Context:** What's the situation and problem?
- **Decision:** What did we decide to do?
- **Consequences:** What are the trade-offs and implications?

## Planned ADRs

Examples of decisions we'll document:

- `0001-monorepo-structure.md` - Why we chose monorepo over multi-repo
- `0002-independent-package-versioning.md` - Why packages version independently
- `0003-git-tagging-convention.md` - Why we use `{package}-v{version}` format
- `0004-core-library-extraction.md` - Why we extracted platform-agnostic core

## Stay Tuned

We'll be adding ADRs as the project evolves. Check back soon!
