import assert from 'node:assert';

import { buildFilePathPattern, DEFAULT_DELIMITERS, extractFilePath } from 'rangelink-core-ts';

const matchPaths = (text: string): string[] => {
  const pattern = buildFilePathPattern(DEFAULT_DELIMITERS);
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    results.push(extractFilePath(match));
  }
  return results;
};

suite('File Path Detection', () => {
  // TC-150: Absolute path
  test('TC-150: detects absolute path (/path/to/file.ts)', () => {
    const paths = matchPaths('Check /path/to/file.ts for details');
    assert.strictEqual(paths.length, 1, `Expected 1 match but got ${paths.length}`);
    assert.strictEqual(paths[0], '/path/to/file.ts');
  });

  // TC-151: Relative path
  test('TC-151: detects relative path (./file.ts)', () => {
    const paths = matchPaths('See ./file.ts for usage');
    assert.strictEqual(paths.length, 1, `Expected 1 match but got ${paths.length}`);
    assert.strictEqual(paths[0], './file.ts');
  });

  // TC-152: Parent-relative path
  test('TC-152: detects parent-relative path (../dir/file.ts)', () => {
    const paths = matchPaths('Imported from ../dir/file.ts');
    assert.strictEqual(paths.length, 1, `Expected 1 match but got ${paths.length}`);
    assert.strictEqual(paths[0], '../dir/file.ts');
  });

  // TC-153: Tilde home path
  test('TC-153: detects tilde home path (~/projects/app.ts)', () => {
    const paths = matchPaths('Open ~/projects/app.ts in the editor');
    assert.strictEqual(paths.length, 1, `Expected 1 match but got ${paths.length}`);
    assert.strictEqual(paths[0], '~/projects/app.ts');
  });

  // TC-154: Double-quoted path with spaces
  test('TC-154: detects double-quoted path with spaces and strips quotes', () => {
    const paths = matchPaths('Open "/path/with spaces/file.ts" now');
    assert.strictEqual(paths.length, 1, `Expected 1 match but got ${paths.length}`);
    assert.strictEqual(paths[0], '/path/with spaces/file.ts');
  });

  // TC-155: Single-quoted path
  test('TC-155: detects single-quoted path and strips quotes', () => {
    const paths = matchPaths("Check '/path/to/file.ts' for details");
    assert.strictEqual(paths.length, 1, `Expected 1 match but got ${paths.length}`);
    assert.strictEqual(paths[0], '/path/to/file.ts');
  });

  // TC-156: HTTP URL is NOT detected
  test('TC-156: does NOT detect HTTP URL as a file path', () => {
    const paths = matchPaths('See https://github.com/foo/bar.ts for reference');
    assert.strictEqual(paths.length, 0, `Expected 0 matches but got ${paths.length}: ${paths.join(', ')}`);
  });

  // TC-157: RangeLink with #L suffix is NOT double-detected
  test('TC-157: does NOT detect RangeLink path (src/foo.ts#L5) as a plain file path', () => {
    const paths = matchPaths('src/foo.ts#L5');
    assert.strictEqual(
      paths.length,
      0,
      `Expected 0 matches (RangeLink coexistence) but got ${paths.length}: ${paths.join(', ')}`,
    );
  });

  // TC-158: ORM-style string without path separator is NOT detected
  test("TC-158: does NOT detect ORM-style string ('User') without a path separator", () => {
    const paths = matchPaths("'User' is not a file path");
    assert.strictEqual(
      paths.length,
      0,
      `Expected 0 matches but got ${paths.length}: ${paths.join(', ')}`,
    );
  });
});
