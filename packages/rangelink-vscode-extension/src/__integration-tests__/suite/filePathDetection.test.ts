import assert from 'node:assert';

import type { DelimiterConfig } from 'rangelink-core-ts';
import { buildFilePathPattern, DEFAULT_DELIMITERS, extractFilePath } from 'rangelink-core-ts';

const matchPaths = (text: string, delimiters: DelimiterConfig = DEFAULT_DELIMITERS): string[] => {
  const pattern = buildFilePathPattern(delimiters);
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    results.push(extractFilePath(match));
  }
  return results;
};

suite('File Path Detection', () => {
  // clickable-file-paths-001: Absolute path
  test('clickable-file-paths-001: detects absolute path (/path/to/file.ts)', () => {
    const paths = matchPaths('Check /path/to/file.ts for details');
    assert.strictEqual(paths.length, 1, `Expected 1 match but got ${paths.length}`);
    assert.strictEqual(paths[0], '/path/to/file.ts');
  });

  // clickable-file-paths-002: Relative path
  test('clickable-file-paths-002: detects relative path (./file.ts)', () => {
    const paths = matchPaths('See ./file.ts for usage');
    assert.strictEqual(paths.length, 1, `Expected 1 match but got ${paths.length}`);
    assert.strictEqual(paths[0], './file.ts');
  });

  // clickable-file-paths-003: Parent-relative path
  test('clickable-file-paths-003: detects parent-relative path (../dir/file.ts)', () => {
    const paths = matchPaths('Imported from ../dir/file.ts');
    assert.strictEqual(paths.length, 1, `Expected 1 match but got ${paths.length}`);
    assert.strictEqual(paths[0], '../dir/file.ts');
  });

  // clickable-file-paths-004: Tilde home path
  test('clickable-file-paths-004: detects tilde home path (~/projects/app.ts)', () => {
    const paths = matchPaths('Open ~/projects/app.ts in the editor');
    assert.strictEqual(paths.length, 1, `Expected 1 match but got ${paths.length}`);
    assert.strictEqual(paths[0], '~/projects/app.ts');
  });

  // clickable-file-paths-005: Double-quoted path with spaces
  test('clickable-file-paths-005: detects double-quoted path with spaces and strips quotes', () => {
    const paths = matchPaths('Open "/path/with spaces/file.ts" now');
    assert.strictEqual(paths.length, 1, `Expected 1 match but got ${paths.length}`);
    assert.strictEqual(paths[0], '/path/with spaces/file.ts');
  });

  // clickable-file-paths-006: Single-quoted path
  test('clickable-file-paths-006: detects single-quoted path and strips quotes', () => {
    const paths = matchPaths("Check '/path/to/file.ts' for details");
    assert.strictEqual(paths.length, 1, `Expected 1 match but got ${paths.length}`);
    assert.strictEqual(paths[0], '/path/to/file.ts');
  });

  // clickable-file-paths-007: HTTP URL is NOT detected
  test('clickable-file-paths-007: does NOT detect HTTP URL as a file path', () => {
    const paths = matchPaths('See https://github.com/foo/bar.ts for reference');
    assert.strictEqual(
      paths.length,
      0,
      `Expected 0 matches but got ${paths.length}: ${paths.join(', ')}`,
    );
  });

  // clickable-file-paths-008: RangeLink with #L suffix is NOT double-detected
  test('clickable-file-paths-008: does NOT detect RangeLink path (src/foo.ts#L5) as a plain file path', () => {
    const paths = matchPaths('src/foo.ts#L5');
    assert.strictEqual(
      paths.length,
      0,
      `Expected 0 matches (RangeLink coexistence) but got ${paths.length}: ${paths.join(', ')}`,
    );
  });

  // clickable-file-paths-009: ORM-style string without path separator is NOT detected
  test("clickable-file-paths-009: does NOT detect ORM-style string ('User') without a path separator", () => {
    const paths = matchPaths("'User' is not a file path");
    assert.strictEqual(
      paths.length,
      0,
      `Expected 0 matches but got ${paths.length}: ${paths.join(', ')}`,
    );
  });

  // clickable-file-paths-012: Custom delimiter — RangeLink with custom line delimiter is NOT detected as plain file path
  // With line='@l', a RangeLink looks like file.ts#@l10 (hash is still '#'). The file path
  // pattern must exclude this so the RangeLink provider handles it instead.
  test('clickable-file-paths-012: does NOT detect RangeLink with custom delimiter (./src/file.ts#@l10) as a plain file path', () => {
    const customDelimiters: DelimiterConfig = {
      ...DEFAULT_DELIMITERS,
      line: '@l',
    };
    const paths = matchPaths('./src/file.ts#@l10', customDelimiters);
    assert.strictEqual(
      paths.length,
      0,
      `Expected 0 matches (custom delimiter coexistence) but got ${paths.length}: ${paths.join(', ')}`,
    );
  });
});
