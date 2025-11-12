# Migrate ROADMAP Item to GitHub Issues

You are a specialized command for migrating ROADMAP.md items to GitHub issues one at a time.

## Usage

The user will specify which ROADMAP section to migrate. If not specified, default to the next priority item following this order:
1. 🔴 Critical bugs
2. 📋 Planned items
3. 📋 Future items

## Migration Workflow

### STEP 1: Parse ROADMAP Section

Read `docs/ROADMAP.md` and extract the specified section with ALL context:
- Title/heading
- Goal/Problem statement
- Implementation details
- Testing criteria
- Done when criteria
- Sub-sections (iterations, phases, tasks)
- Time estimates
- Status markers (🔴 Critical, 📋 Planned, etc.)

### STEP 2: Generate Parent Issue Content

Create autonomous, self-contained issue body with:
- Full context from ROADMAP (no dependency on ROADMAP.md)
- Implementation overview (if applicable)
- Done when criteria as checkboxes
- Links to related docs
- Note about sub-issues if applicable

**Title format:** Use ROADMAP title, remove numbering
- ✅ "Configuration Change Detection"
- ❌ "4A.2) Configuration Change Detection"

### STEP 3: Generate Child Issues (if applicable)

For items with sub-sections/iterations/phases:
- **Title:** "Phase N: <descriptive name>" (following #42 convention)
- **Body template:**
  ```markdown
  **Parent Issue:** #<will-be-filled>

  ## Goal
  [What this phase accomplishes]

  ## Implementation
  [Key steps from ROADMAP]

  ## Done When
  - [ ] Criterion 1
  - [ ] Criterion 2
  ```

### STEP 4: Show Preview

Display ALL generated content in a formatted preview:
```
=== PARENT ISSUE ===
Title: <title>
Labels: <labels>
Body:
<full body>

=== CHILD ISSUE 1 ===
Title: <title>
Labels: <labels>
Body:
<full body>

=== CHILD ISSUE 2 ===
...

=== ROADMAP UPDATE ===
Will replace lines X-Y with:
<replacement text>
```

### STEP 5: Wait for User Approval

Ask: **"Ready to create these issues and commit? (yes/no)"**

If no: Ask what to adjust and regenerate
If yes: Proceed to step 6

### STEP 6: Create GitHub Issues with Native Parent-Child Relationships

```bash
# Create labels if needed
gh label create "type:bug" --description "Bug or defect" --color "d73a4a" 2>/dev/null || true
gh label create "priority:critical" --description "Critical priority" --color "b60205" 2>/dev/null || true
# ... other labels as needed

# Create parent issue
PARENT_URL=$(gh issue create --title "<title>" --body "<body>" --label "<labels>")
PARENT_NUM=$(echo "$PARENT_URL" | grep -oE '[0-9]+$')
echo "Created parent: #$PARENT_NUM"

# Get parent issue node ID (required for GraphQL API)
PARENT_ID=$(gh api repos/:owner/:repo/issues/$PARENT_NUM --jq '.node_id')

# Create child issues (if any) with native sub-issue relationships
sleep 1
CHILD_URL=$(gh issue create --title "Phase 1: <title>" --body "<body with #$PARENT_NUM>" --label "<labels>")
CHILD_NUM=$(echo "$CHILD_URL" | grep -oE '[0-9]+$')
CHILD_ID=$(gh api repos/:owner/:repo/issues/$CHILD_NUM --jq '.node_id')

# Link child to parent using GitHub's native sub-issue API
gh api graphql -H "GraphQL-Features: sub_issues" -f query="
  mutation {
    addSubIssue(input: {issueId: \"$PARENT_ID\", subIssueId: \"$CHILD_ID\"}) {
      clientMutationId
    }
  }
"

sleep 1
# Repeat for each child issue...
```

**Why native relationships?**
- Shows sub-issues in GitHub UI with progress tracking
- Enables filtering: `has:sub-issues` and `has:parent-issue`
- Better project board integration
- Automatic progress calculation on parent issue

### STEP 7: Update ROADMAP.md

Replace the migrated section with:
```markdown
### <original heading> — [GitHub #XX](https://github.com/couimet/rangeLink/issues/XX)

**Goal:** <1-2 sentence summary>

**Status:** See GitHub issue #XX for detailed breakdown and progress.
```

### STEP 8: Create Commit Message File

Check highest numbered file in `.commit-msgs/`:
```bash
HIGHEST=$(ls .commit-msgs/*.txt 2>/dev/null | grep -oE '[0-9]+' | sort -n | tail -1)
NEXT=$((HIGHEST + 1))
NEXT_PADDED=$(printf "%04d" $NEXT)
```

Create `.commit-msgs/${NEXT_PADDED}-migrate-<slug>.txt`:
```
migrate: move <item name> to GitHub issues

Migrated ROADMAP section to GitHub for better tracking/prioritization.

Parent: #XX
Children: #YY, #ZZ (if applicable)

Benefits:
- Easier collaboration and progress tracking
- Better prioritization with GitHub features
- Autonomous issues (no ROADMAP dependency)
```

### STEP 9: Commit Changes

```bash
git add docs/ROADMAP.md
git commit -F .commit-msgs/<file>.txt
```

### STEP 10: Summary Report

```
✅ Migration Complete!

Parent Issue: #XX - <title>
  https://github.com/couimet/rangeLink/issues/XX

Child Issues:
  #YY - Phase 1: <title>
  #ZZ - Phase 2: <title>

Commit: <sha>
Commit message: .commit-msgs/<file>.txt

ROADMAP.md updated: Section replaced with reference to #XX

---

Next Steps:
- Run this command again to migrate the next item
- Next suggested item: <name of next priority item>
```

## Migration Rules

Based on `.claude-questions/0031-roadmap-github-migration-strategy.txt`:

1. **Autonomous issues** - Full context, no ROADMAP.md dependency
2. **Phase N naming** - Use "Phase N: description" for children (following #42)
3. **Labels** - Create `type:` and `priority:` labels as needed
4. **Native sub-issues** - Use GitHub's GraphQL API to create proper parent-child relationships
5. **No milestones** - Parent/child relationships only
6. **Skip completed** - Don't migrate ✅ items (they're in JOURNEY.md)
7. **Single commit** - Parent + children + ROADMAP update
8. **Lightweight template** - Parent link + Goal + Done When
9. **Throttling** - 1s delay between issue creations
10. **One at a time** - Migrate ONE parent item per invocation

## Label Strategy

Create labels as needed:

- `type:bug` - Bug or defect
- `type:enhancement` - New feature
- `type:refactor` - Code quality improvement
- `type:debt` - Technical debt
- `priority:critical` - Must fix ASAP
- `priority:high` - Important
- `priority:low` - Nice to have

Apply based on ROADMAP markers:

- 🔴 Critical → `priority:critical`
- Bug/fix → `type:bug`
- Enhancement/feature → `type:enhancement`
- Refactor/cleanup → `type:refactor`
- Technical debt → `type:debt`

## Important Constraints

- Use `gh issue create` command (not GitHub API directly)
- Extract issue numbers with `grep -oE '[0-9]+$'`
- Keep ROADMAP section headers for discoverability
- Show full preview before creating issues
- Wait for explicit user approval
- Handle items with no sub-phases (single issue, no children)

## Example Invocation

User: `/migrate-roadmap-item`
→ Migrates next priority item (critical bugs first)

User: `/migrate-roadmap-item "Enhanced Navigation Feedback"`
→ Migrates specific section by searching for title

User: `/migrate-roadmap-item 4A.5`
→ Migrates specific section by number
