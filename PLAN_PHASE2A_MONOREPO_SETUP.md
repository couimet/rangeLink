# Phase 2A: Monorepo Setup - Detailed Plan

## Overview

**Goal:** Transform the current single-package structure into a monorepo with pnpm workspaces  
**Time Estimate:** 1 hour  
**Scope:** Structure only, no code changes

## Current Structure

```
rangeLink/
  src/
    extension.ts
    extension.test.ts
    index.ts
    test/
  package.json
  tsconfig.json
  jest.config.js
  ...
```

## Target Structure

```
rangeLink/
  packages/
    rangelink-vscode-extension/
      src/
        extension.ts
        extension.test.ts
        index.ts
        test/
      package.json          # Updated paths
      tsconfig.json         # Updated paths
      jest.config.js        # Updated paths
      README.md             # New: extension-specific
  package.json            # Updated: workspace root
  pnpm-workspace.yaml     # New: workspace config
  tsconfig.base.json      # New: shared TypeScript config
  .gitignore              # Updated: add workspace artifacts
```

---

## Step-by-Step Plan

### Step 1: Create Workspace Structure (10 min)

**Actions:**

1. Create `packages/` directory
2. Create `packages/rangelink-vscode-extension/` directory
3. Move existing `src/` to `packages/rangelink-vscode-extension/src/`
4. Move existing test files to extension package

**Commands:**

```bash
mkdir -p packages/rangelink-vscode-extension
mv src packages/rangelink-vscode-extension/
mv jest.config.js packages/rangelink-vscode-extension/
mv tsconfig.json packages/rangelink-vscode-extension/
```

**Validation:**

- [ ] Directory structure matches target
- [ ] No duplicate files

---

### Step 2: Create Workspace Configuration (10 min)

**File 1: `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
```

**File 2: `tsconfig.base.json`** (shared config)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./out",
    "rootDir": "./src",
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

**File 3: Update root `package.json`**

```json
{
  "name": "rangelink-monorepo",
  "private": true,
  "version": "0.1.0",
  "description": "RangeLink monorepo - Core library and IDE extensions",
  "scripts": {
    "compile": "pnpm -r run compile",
    "test": "pnpm -r run test",
    "lint": "pnpm -r run lint",
    "clean": "pnpm -r run clean"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  },
  "engines": {
    "pnpm": ">=8.0.0"
  }
}
```

**Validation:**

- [ ] pnpm-workspace.yaml created
- [ ] tsconfig.base.json created
- [ ] Root package.json updated

---

### Step 3: Configure Extension Package (15 min)

**File: `packages/rangelink-vscode-extension/package.json`**

Changes needed:

1. Update `name` to keep it as "rangelink" (for VSCode marketplace)
2. Add workspace references
3. Update file paths (main, scripts)
4. Keep all VSCode-specific metadata

**Updated package.json** (key sections):

```json
{
  "name": "rangelink",
  "displayName": "RangeLink",
  "version": "0.1.0",
  "main": "./out/extension.js",
  "scripts": {
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "test": "jest --coverage",
    "lint": "eslint src --ext ts",
    "clean": "rm -rf out"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "^20.x",
    "@types/jest": "^29.5.11",
    "typescript": "^5.3.3",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.18.1",
    "@typescript-eslint/parser": "^6.18.1"
  }
}
```

**File: `packages/rangelink-vscode-extension/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./out",
    "rootDir": "./src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "out"]
}
```

**File: `packages/rangelink-vscode-extension/README.md`** (new)

````markdown
# RangeLink VSCode Extension

VSCode extension for creating and navigating code range links.

Part of the RangeLink monorepo. See [main README](../../README.md) for full documentation.

## Development

```bash
# From monorepo root
pnpm install
pnpm compile
pnpm test
```
````

## Publishing

See [PUBLISHING.md](../../PUBLISHING.md) for release process.

````

**Validation:**
- [ ] package.json paths updated
- [ ] tsconfig.json extends base config
- [ ] Extension-specific README created

---

### Step 4: Update Root Configuration Files (10 min)

**File: `.gitignore`** (add workspace-specific entries)
```gitignore
# Existing entries...

# Workspace
node_modules/
packages/*/node_modules/
packages/*/out/
packages/*/dist/
*.tsbuildinfo
````

**File: Root `.vscode/settings.json`** (if exists, update)

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "search.exclude": {
    "**/node_modules": true,
    "**/out": true,
    "**/dist": true
  }
}
```

**Validation:**

- [ ] .gitignore updated
- [ ] VSCode settings updated (if applicable)

---

### Step 5: Install Dependencies & Test (15 min)

**Commands:**

```bash
# Clean old node_modules
rm -rf node_modules package-lock.json

# Install with pnpm (will use workspaces)
pnpm install

# Compile all packages
pnpm compile

# Run all tests
pnpm test
```

**Expected Results:**

- ✅ pnpm install succeeds
- ✅ Compilation succeeds (no errors)
- ✅ All 114 tests pass
- ✅ Coverage reports work

**Validation:**

- [ ] Dependencies installed
- [ ] Compilation works
- [ ] Tests pass (114 passing, 3 skipped)
- [ ] No broken imports or paths

---

## Out of Scope (Explicitly NOT in 2A)

❌ **NOT doing in this iteration:**

- Extracting core library (Phase 2B)
- Creating additional packages
- Changing any code logic
- Updating imports
- Moving test files to separate directory
- Creating CI/CD workflows
- Publishing to npm
- Documentation updates (beyond basic README)

✅ **ONLY doing:**

- Directory restructuring
- Workspace configuration
- Path updates in config files
- Verifying existing tests pass

---

## Success Criteria ("Done When")

Phase 2A is complete when ALL of the following are true:

1. ✅ **Structure:** `packages/rangelink-vscode-extension/` exists with all source files
2. ✅ **Workspace:** `pnpm-workspace.yaml` and `tsconfig.base.json` created
3. ✅ **Compilation:** `pnpm compile` runs without errors
4. ✅ **Tests:** `pnpm test` shows 114 passing, 3 skipped (same as before)
5. ✅ **Git:** `git status` shows only expected changes (no accidental deletions)
6. ✅ **VSCode:** Extension still loads in development (F5 debug works)

**If ANY of these fail, we stop and fix before proceeding.**

---

## Risk Assessment

### Low Risk ✅

- Moving files (can easily undo)
- Creating new config files (additive)
- Updating paths (testable)

### Medium Risk ⚠️

- pnpm workspace behavior (might have edge cases)
- TypeScript path resolution (need to verify imports work)
- Jest configuration (paths might break tests)

### Mitigation Strategies

1. **Test frequently:** After each step, run `pnpm compile` and `pnpm test`
2. **Git checkpoint:** Commit after Step 3 (structure done) before Step 5 (testing)
3. **Keep old structure:** Don't delete anything until tests pass
4. **Document issues:** If something breaks, note it and solution

---

## Rollback Plan

If Phase 2A fails and can't be fixed quickly:

```bash
# Option 1: Git reset (if committed intermediate steps)
git reset --hard HEAD~1

# Option 2: Manual revert
rm -rf packages/
mv packages_backup/* .  # If we made a backup
pnpm install
```

**When to rollback:**

- Tests fail and can't be fixed in 15 minutes
- Compilation errors that are unclear
- pnpm workspace issues that block progress

**Better approach:** Small commits after each step, so we can rollback to last working state.

---

## Estimated Timeline

| Step | Task                     | Time   | Cumulative |
| ---- | ------------------------ | ------ | ---------- |
| 1    | Create structure         | 10 min | 10 min     |
| 2    | Workspace config         | 10 min | 20 min     |
| 3    | Extension package config | 15 min | 35 min     |
| 4    | Root config updates      | 10 min | 45 min     |
| 5    | Install & test           | 15 min | **60 min** |

**Total: 1 hour**

---

## Pre-Flight Checklist

Before starting Phase 2A:

- [ ] Current git status is clean (committed Phase 1 work)
- [ ] All 114 tests currently passing
- [ ] pnpm is installed (`pnpm --version` works)
- [ ] Have 1+ hours of uninterrupted time
- [ ] Read this entire plan and understand each step
- [ ] Know how to rollback if needed

---

## Questions to Answer Before Starting

1. **Do we have pnpm installed?**
   - If not: `npm install -g pnpm` or `corepack enable`

2. **Should we create a backup first?**
   - Recommendation: YES, quick tar/zip of current state
   - Or: Ensure current work is committed to git

3. **Any custom VSCode launch configurations to update?**
   - Check `.vscode/launch.json` if it exists
   - Update paths if they reference `src/` directly

4. **Do we want to test extension loading in VSCode after?**
   - Recommendation: YES, press F5 to ensure debug works

---

## Post-Completion Actions

After Phase 2A is done:

1. **Commit:** "feat(monorepo): phase 2A - workspace setup"
2. **Update README:** Mark Phase 2A as complete ✅
3. **Update TODOs:** Mark 2A done, prepare for 2B
4. **Document learnings:** Any issues encountered? Update this plan.
5. **Take a break:** 5-10 min before starting 2B

---

## Next Steps (Phase 2B Preview)

After 2A is complete, Phase 2B will:

- Create `packages/rangelink-core-ts/`
- Extract core types and logic
- Set up dependency: extension → core

But that's for AFTER 2A is fully complete and committed.

---

## Summary

**Phase 2A is the foundation:** Get the monorepo structure right, verify everything still works.

**Key principle:** Move files, update paths, test thoroughly. No logic changes.

**Success:** Same functionality, new structure, all tests green.

---

**Ready to proceed?**

Review this plan, ask any questions, then I'll execute step-by-step with validation at each stage.
