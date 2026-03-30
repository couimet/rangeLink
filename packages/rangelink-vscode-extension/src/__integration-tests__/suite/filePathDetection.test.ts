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
  test('clickable-file-paths-001: detects absolute path (/path/to/file.ts)', () => {
    assert.deepStrictEqual(matchPaths('Check /path/to/file.ts for details'), ['/path/to/file.ts']);
  });

  test('clickable-file-paths-002: detects relative path (./file.ts)', () => {
    assert.deepStrictEqual(matchPaths('See ./file.ts for usage'), ['./file.ts']);
  });

  test('clickable-file-paths-003: detects parent-relative path (../dir/file.ts)', () => {
    assert.deepStrictEqual(matchPaths('Imported from ../dir/file.ts'), ['../dir/file.ts']);
  });

  test('clickable-file-paths-004: detects tilde home path (~/projects/app.ts)', () => {
    assert.deepStrictEqual(matchPaths('Open ~/projects/app.ts in the editor'), [
      '~/projects/app.ts',
    ]);
  });

  test('clickable-file-paths-005: detects double-quoted path with spaces and strips quotes', () => {
    assert.deepStrictEqual(matchPaths('Open "/path/with spaces/file.ts" now'), [
      '/path/with spaces/file.ts',
    ]);
  });

  test('clickable-file-paths-006: detects single-quoted path and strips quotes', () => {
    assert.deepStrictEqual(matchPaths("Check '/path/to/file.ts' for details"), [
      '/path/to/file.ts',
    ]);
  });

  test('clickable-file-paths-007: does NOT detect HTTP URL as a file path', () => {
    assert.deepStrictEqual(matchPaths('See https://github.com/foo/bar.ts for reference'), []);
  });

  test('clickable-file-paths-008: does NOT detect RangeLink path (src/foo.ts#L5) as a plain file path', () => {
    assert.deepStrictEqual(matchPaths('src/foo.ts#L5'), []);
  });

  test("clickable-file-paths-009: does NOT detect ORM-style string ('User') without a path separator", () => {
    assert.deepStrictEqual(matchPaths("'User' is not a file path"), []);
  });

  test('clickable-file-paths-012: does NOT detect RangeLink with custom delimiter (./src/file.ts#@l10) as a plain file path', () => {
    const customDelimiters: DelimiterConfig = {
      ...DEFAULT_DELIMITERS,
      line: '@l',
    };
    assert.deepStrictEqual(matchPaths('./src/file.ts#@l10', customDelimiters), []);
  });
});
