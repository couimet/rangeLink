# Publishing RangeLink Core Library

> **Note:** This guide covers publishing the RangeLink core TypeScript library specifically. For an overview of all publishable packages in this monorepo, see the [root PUBLISHING.md](../../PUBLISHING.md).

## 🚧 Coming Soon

The `rangelink-core-ts` package will be published to npm as a standalone library for generating range links in any TypeScript/JavaScript project.

### What is rangelink-core-ts?

A pure TypeScript core library for RangeLink with:
- **Zero dependencies** - Completely standalone
- **Platform-agnostic** - Works in Node.js, browsers, Deno, etc.
- **Type-safe** - Full TypeScript support with comprehensive type definitions
- **Well-tested** - Extensive test coverage

### Planned Features

When published, you'll be able to use it like this:

```typescript
import { formatLink, formatPortableLink } from 'rangelink-core-ts';

// Generate a range link
const link = formatLink('/path/to/file.ts', { start: { line: 10, position: 5 }, end: { line: 20, position: 15 } });
// => "/path/to/file.ts#L10C5-L20C15"

// Generate a portable link with metadata
const portableLink = formatPortableLink('/path/to/file.ts', { start: { line: 10 }, end: { line: 20 } }, 'Selected code snippet');
// => "/path/to/file.ts#L10-L20|Selected code snippet"
```

### Current Status

The library is **feature-complete and fully tested** for internal use by the VS Code extension. We're preparing it for public release on npm, which will include:

- [ ] Final API review and documentation
- [ ] Publishing workflow setup
- [ ] npm package configuration
- [ ] Usage examples and guides
- [ ] Migration guide for adopters

### Stay Tuned

Follow the [RangeLink repository](https://github.com/couimet/rangelink) for updates on the npm release.
