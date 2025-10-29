# Testing Guide

RangeLink aims for **100% branch coverage** to ensure reliability and catch edge cases.

## Running Tests

```bash
# Run all tests with coverage
npm test

# Run in watch mode (auto-rerun on file changes)
npm run test:watch

# Generate detailed coverage report
npm run test:coverage
```

## Coverage Reports

After running `npm run test:coverage`, open:

- **HTML Report**: `coverage/lcov-report/index.html`
- **Text Summary**: Shows in terminal
- **LCOV**: `coverage/lcov.info` (for CI/CD integration)

## Test Structure

- `src/extension.test.ts` - Unit tests for `RangeLinkService`
- Tests cover all code paths including edge cases

## What We Test

### RangeLinkService Methods

✅ `createLink()` - Main command handler

- Cursor position (empty selection)
- Full line selections
- Partial line selections (columns)
- Multi-line selections
- Relative vs absolute paths
- Error handling (no editor)
- Status bar feedback

✅ `formatLink()` - Link formatting logic

- Line number format
- Column-specific format
- Multi-line ranges
- Edge cases (single char, very long ranges)

✅ `dispose()` - Cleanup

- Proper resource disposal

### Extension Lifecycle

✅ `activate()` - Extension initialization

- Command registration
- Subscription management

✅ `deactivate()` - Extension cleanup

- Service disposal

## Adding New Tests

When adding features, ensure:

1. **All branches are covered** (if-statements, ternaries, logical operators)
2. **Error paths are tested** (invalid inputs, missing dependencies)
3. **Edge cases are handled** (empty values, boundaries)
4. **Mock behavior matches real VSCode APIs**

Example:

```typescript
it('should handle [specific edge case]', async () => {
  // Setup mock conditions
  mockWindow.activeTextEditor = {
    selection: {
      /* ... */
    },
    document: {
      /* ... */
    },
  };

  await service.createLink(false);

  expect(mockClipboard.writeText).toHaveBeenCalledWith(expectedValue);
});
```

## Coverage Goals

- **Branches**: 100% (all if/else paths)
- **Functions**: 100% (all methods called)
- **Lines**: 100% (all statements executed)
- **Statements**: 100% (all code executed)

The `jest.config.js` enforces 100% coverage threshold. If tests don't meet this, Jest will fail.

## Troubleshooting

### Tests failing with "Cannot find module 'vscode'"

The mock setup in `src/test/vscode.ts` handles this. Make sure `jest.config.js` maps the `vscode` module correctly.

### Coverage below 100%

Run with verbose output:

```bash
npm test -- --verbose
```

Check which branches are untested and add cases for them.

### Tests pass but coverage check fails

Jest config enforces 100% threshold. Add tests to cover untested branches.

## CI/CD Integration

Include in your CI pipeline:

```bash
npm install
npm run compile
npm test  # Fails if coverage below 100%
```
