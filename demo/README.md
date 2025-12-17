# RangeLink Demo Materials

Demo scripts, sample files, and recording instructions for RangeLink promotional materials.

## Available Demos

| Demo                                | Duration | Description                                               |
| ----------------------------------- | -------- | --------------------------------------------------------- |
| [01-basic-usage](./01-basic-usage/) | 40-45s   | Core workflow: select → copy link → paste → navigate back |

## Quick Start

```bash
cd demo/01-basic-usage
# Read README.md for setup and recording steps
# Use QUICK-REFERENCE.md as a cheat sheet while recording
```

## Creating New Demos

Use the `/create-demo` custom Claude command for a guided wizard:

```bash
/create-demo
```

The wizard walks you through:

1. **Discovery questions** — purpose, audience, features, scenario, production style
2. **Flow formalization** — timestamped recording script with acts and steps
3. **File generation** — README.md, QUICK-REFERENCE.md, sample code files

## Structure

Each demo folder contains README.md (recording instructions), QUICK-REFERENCE.md (cheat sheet), and sample code files.

```text
demo/
├── ASSET-STORAGE.md   # Binary storage strategy
└── 01-basic-usage/    # First demo
```

## Recording Tools (macOS)

- **Kap** (free) — [getkap.co](https://getkap.co)
- **CleanShot X** (paid) — professional editing
- **Built-in** — `Cmd+Shift+5`

## Key Guidelines

- **Light theme** for readability in compressed GIFs
- **Font size 16-18px** minimum
- **Pause 1-2 seconds** after key actions
- **Target <5MB** for GIFs, <20MB for MP4

## Related Docs

- [ASSET-STORAGE.md](./ASSET-STORAGE.md) — Binary storage strategy (GitHub Releases)
- [docs/DEMO-PLACEMENT-GUIDE.md](../docs/DEMO-PLACEMENT-GUIDE.md) — Where to place demos in README
