import { createMockUri } from '../../__tests__/helpers/createMockUri';
import { isUriWithinDir } from '../isUriWithinDir';

import * as path from 'node:path';

// Fixtures use path.join from a path.sep root so dirPrefix matches on every platform
const TEST_SRC_ROOT = path.join(path.sep, 'src');
const TEST_FOLDER = path.join(TEST_SRC_ROOT, 'folder');

describe('isUriWithinDir', () => {
  it('returns true for an exact match', () => {
    const uri = createMockUri(TEST_FOLDER);

    expect(isUriWithinDir(uri, createMockUri(TEST_FOLDER))).toBe(true);
  });

  it('returns true for a direct child file', () => {
    const uri = createMockUri(path.join(TEST_FOLDER, 'file.ts'));

    expect(isUriWithinDir(uri, createMockUri(TEST_FOLDER))).toBe(true);
  });

  it('returns true for a nested descendant', () => {
    const uri = createMockUri(path.join(TEST_FOLDER, 'sub', 'dir', 'file.ts'));

    expect(isUriWithinDir(uri, createMockUri(TEST_FOLDER))).toBe(true);
  });

  it('returns true for a descendant when the directory is the root', () => {
    const uri = createMockUri(path.join(TEST_FOLDER, 'file.ts'));

    expect(isUriWithinDir(uri, createMockUri(path.parse(TEST_SRC_ROOT).root))).toBe(true);
  });

  it('returns true for a descendant when the directory URI has a trailing separator', () => {
    const uri = createMockUri(path.join(TEST_FOLDER, 'file.ts'));

    expect(isUriWithinDir(uri, createMockUri(path.join(TEST_FOLDER, path.sep)))).toBe(true);
  });

  it('returns false for a partial-name prefix', () => {
    const uri = createMockUri(path.join(TEST_SRC_ROOT, 'foobar', 'file.ts'));

    expect(isUriWithinDir(uri, createMockUri(path.join(TEST_SRC_ROOT, 'foo')))).toBe(false);
  });

  it('returns false for a sibling path', () => {
    const uri = createMockUri(path.join(TEST_SRC_ROOT, 'other', 'file.ts'));

    expect(isUriWithinDir(uri, createMockUri(TEST_FOLDER))).toBe(false);
  });

  it('returns false when the scheme differs', () => {
    const uri = createMockUri(path.join(TEST_FOLDER, 'file.ts'), { scheme: 'untitled' });

    expect(isUriWithinDir(uri, createMockUri(TEST_FOLDER))).toBe(false);
  });

  it('returns false when the authority differs', () => {
    const uri = createMockUri(path.join(TEST_FOLDER, 'file.ts'), { authority: 'remote-host' });

    expect(isUriWithinDir(uri, createMockUri(TEST_FOLDER, { authority: 'other-host' }))).toBe(false);
  });
});
