import { isWritableScheme } from '..';

describe('isWritableScheme', () => {
  describe('writable schemes', () => {
    it('returns true for file scheme', () => {
      expect(isWritableScheme('file')).toBe(true);
    });

    it('returns true for untitled scheme', () => {
      expect(isWritableScheme('untitled')).toBe(true);
    });
  });

  describe('read-only schemes', () => {
    it('returns false for git scheme', () => {
      expect(isWritableScheme('git')).toBe(false);
    });

    it('returns false for output scheme', () => {
      expect(isWritableScheme('output')).toBe(false);
    });

    it('returns false for vscode-settings scheme', () => {
      expect(isWritableScheme('vscode-settings')).toBe(false);
    });

    it('returns false for debug scheme', () => {
      expect(isWritableScheme('debug')).toBe(false);
    });

    it('returns false for vscode-remote scheme', () => {
      expect(isWritableScheme('vscode-remote')).toBe(false);
    });

    it('returns false for walkThrough scheme', () => {
      expect(isWritableScheme('walkThrough')).toBe(false);
    });

    it('returns false for inmemory scheme', () => {
      expect(isWritableScheme('inmemory')).toBe(false);
    });
  });
});
