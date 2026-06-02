---
name: affected-tests
version: 2026.05.29
description: Generate a compact grep-based affected tests for all integration tests changed on the current branch. Appends a "Affected Tests" block to the finish-issue note.
argument-hint: [optional: base-branch, default: origin/main]
allowed-tools: Bash(git branch --show-current), Bash(git diff *), Bash(git merge-base *), Read, Write, Edit, Glob, Grep
---

# Affected Tests

Generate a compact `pnpm test:release:grep "..."` command covering every integration test changed on the current branch vs the base branch. Includes both regular and `[assisted]` TCs so the user can run them manually before CI handles automated-only validation. Appends the result as a `## Affected Tests` block at the end of the finish-issue note.

**Input:** $ARGUMENTS

If no base branch is provided, read the finish-issue note (most recent `.claude-work/notes/*finish*.txt`) and extract `Base branch:` from it. If neither exists, default to `origin/main`.

## Step 1: Determine the Base Branch

Check if the user provided a base branch argument. If not, find the most recent finish-issue note:

```bash
ls -t .claude-work/notes/*finish*.txt 2>/dev/null | head -1
```

If a note exists, extract `Base branch:` from it. Otherwise use `origin/main`. Record this as BASE_BRANCH.

## Step 2: Find Changed Integration Test Files

```bash
git diff --name-only BASE_BRANCH -- packages/rangelink-vscode-extension/src/__integration-tests__/suite/
```

If no files changed, print "No integration test files changed" and stop.

## Step 3: Extract All TC IDs

Extract TC IDs from `test(...)` calls, filtering out log-marker prefixes (`before-*`, `after-*`, `rl-*`, `ctxmenu-*`, `csc-*`, `clean-*`):

```bash
for f in $(git diff --name-only BASE_BRANCH -- packages/rangelink-vscode-extension/src/__integration-tests__/suite/); do
  grep -oE "test\('(\[assisted\] )?[a-z]+(-[a-z]+)+-[0-9]+" "$f" | sed "s/test('//" | sed "s/\[assisted\] //"
done | grep -vE "^(before-|after-|rl-|ctxmenu-|csc-|clean-)" | sort -u > /tmp/tc-ids.txt
```

This captures both `[assisted]` and regular test IDs, filtering out internal log markers.

## Step 4: Compress into a Compact Grep Expression

Save the IDs to `/tmp/tc-ids.txt` then run this Node.js script inside the project directory:

```javascript
const fs = require('fs');
const ids = fs.readFileSync('/tmp/tc-ids.txt', 'utf8').trim().split('\n');

const groups = {};
for (const id of ids) {
  const m = id.match(/^(.+)-(\d+)$/);
  if (!m) continue;
  const [, slug, num] = m;
  if (!groups[slug]) groups[slug] = new Set();
  groups[slug].add(parseInt(num, 10));
}

const compressSet = (numSet) => {
  const nums = [...numSet].sort((a, b) => a - b);
  if (nums.length === 0) return '';
  if (nums.length === 1) return String(nums[0]).padStart(3, '0');

  // Group by first 2 digits of zero-padded representation
  const padGroups = {};
  for (const n of nums) {
    const padded = String(n).padStart(3, '0');
    const prefix = padded.slice(0, 2);
    const one = padded[2];
    if (!padGroups[prefix]) padGroups[prefix] = new Set();
    padGroups[prefix].add(one);
  }

  const parts = [];
  for (const [prefix, oneSet] of Object.entries(padGroups)) {
    const ones = [...oneSet].sort();

    if (ones.length === 10) {
      parts.push(prefix + '[0-9]');
      continue;
    }

    let charClass = '';
    let i = 0;
    while (i < ones.length) {
      let j = i;
      while (
        j + 1 < ones.length &&
        ones[j + 1] === String.fromCharCode(ones[j].charCodeAt(0) + 1)
      ) {
        j++;
      }
      if (j > i) {
        charClass += ones[i] + '-' + ones[j];
        i = j + 1;
      } else {
        charClass += ones[i];
        i++;
      }
    }

    if (charClass.length === 1) {
      parts.push(prefix + charClass);
    } else {
      parts.push(prefix + '[' + charClass + ']');
    }
  }

  return parts.length === 1 ? parts[0] : '(' + parts.join('|') + ')';
};

const featureParts = Object.entries(groups)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([slug, numSet]) => slug + '-' + compressSet(numSet));

const result = featureParts.join('|');
console.log(result);
```

Verify all IDs match:

```javascript
const regex = new RegExp('^(' + result + ')$');
let ok = 0,
  fail = 0;
for (const id of ids) {
  if (regex.test(id)) ok++;
  else {
    console.log('FAIL:', id);
    fail++;
  }
}
console.log('Match: ' + ok + '/' + ids.length + ' pass, ' + fail + ' fail');
```

If any IDs fail, fix the compression logic before proceeding.

## Step 5: Find the Finish-Issue Note and Update

Locate the most recent finish-issue note with `ls -t .claude-work/notes/*finish*.txt 2>/dev/null | head -1`. If it exists:

1. Read the file
2. If a `## Affected Tests` section already exists, replace it
3. If not, append a `## Affected Tests` section before `## Related` (or at the end if no Related section)

If no finish-issue note exists, print the command block to stdout and tell the user to copy it into their note.

## Step 6: Report

Print a brief summary:

- Number of TC IDs found
- Number of changed test files
- Where the affected tests was written (note path or stdout)
