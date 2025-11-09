# Custom Claude Code Agents

This directory contains custom subagents for the RangeLink project.

## Available Agents

### test-scope-fixer

**Purpose**: Detects and fixes badly scoped tests that test implementation details instead of mocking delegated utility functions.

**When to use**: When you have test files that directly test the behavior of utility functions instead of mocking them and testing only the delegation logic.

**Usage**:

```
Task(subagent_type="test-scope-fixer", prompt="Analyze <test-file-path>")
```

**Workflow**:

1. **Phase 1 (Analysis)**: Agent analyzes tests, identifies badly scoped ones, checks utility test coverage, and presents a detailed refactoring plan
2. **User reviews and approves** the plan
3. **Phase 2 (Refactoring)**: Agent applies the changes (adds mocks, removes badly scoped tests, adds properly scoped tests)
4. **Phase 3 (Report)**: Agent runs tests and reports results

**Key Features**:

- Detects tests that verify utility function implementation details
- Checks for coverage gaps in utility test files
- Uses `jest.mock()` for module-level mocking
- Uses `jest.spyOn()` for per-test customization
- Ensures each test asserts on mock calls (delegation verification)
- Runs tests after refactoring to verify correctness

## How Agents Work

**Accessing agents**:

- Use the `/agents` command to list available agents
- Invoke with `Task(subagent_type="agent-name", ...)`

## Testing New Agents

After creating a new agent file:

1. **Verify file structure**: Ensure YAML frontmatter is correct
2. **Restart Claude Code session**: Agents may need session reload
3. **List agents**: Run `/agents` to verify it's detected
4. **Test with simple prompt**: Start with basic usage to verify behavior

## Agent Development Tips

1. **Clear descriptions**: Use natural language that explains WHEN to use the agent
2. **Focused tools**: Only grant tools the agent actually needs
3. **Structured workflow**: Break complex tasks into numbered phases
4. **Wait for approval**: For destructive operations, always present a plan first
5. **Detailed reports**: Show what changed, why, and any issues found
6. **Handle edge cases**: Document how agent handles missing files, ambiguous cases, etc.
