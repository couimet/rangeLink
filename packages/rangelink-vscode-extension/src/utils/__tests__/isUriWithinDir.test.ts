import { createMockUri } from '../../__tests__/helpers/createMockUri';
import { isUriWithinDir } from '../isUriWithinDir';

describe('isUriWithinDir', () => {
  it('returns true for an exact match', () => {
    const uri = createMockUri('/src/folder');

    expect(isUriWithinDir(uri, createMockUri('/src/folder'))).toBe(true);
  });

  it('returns true for a direct child file', () => {
    const uri = createMockUri('/src/folder/file.ts');

    expect(isUriWithinDir(uri, createMockUri('/src/folder'))).toBe(true);
  });

  it('returns true for a nested descendant', () => {
    const uri = createMockUri('/src/folder/sub/dir/file.ts');

    expect(isUriWithinDir(uri, createMockUri('/src/folder'))).toBe(true);
  });

  it('returns false for a partial-name prefix', () => {
    const uri = createMockUri('/src/foobar/file.ts');

    expect(isUriWithinDir(uri, createMockUri('/src/foo'))).toBe(false);
  });

  it('returns false for a sibling path', () => {
    const uri = createMockUri('/src/other/file.ts');

    expect(isUriWithinDir(uri, createMockUri('/src/folder'))).toBe(false);
  });

  it('returns false when the scheme differs', () => {
    const uri = createMockUri('/src/folder/file.ts', { scheme: 'untitled' });

    expect(isUriWithinDir(uri, createMockUri('/src/folder'))).toBe(false);
  });

  it('returns false when the authority differs', () => {
    const uri = createMockUri('/src/folder/file.ts', { authority: 'remote-host' });

    expect(isUriWithinDir(uri, createMockUri('/src/folder', { authority: 'other-host' }))).toBe(false);
  });
});
