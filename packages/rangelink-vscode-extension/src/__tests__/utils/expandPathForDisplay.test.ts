import os from 'node:os';

import { expandPathForDisplay } from '../../utils/expandPathForDisplay';

const CONTEXT_FS_PATH = '/workspace/docs/notes.md';
const CONTEXT_DIR = '/workspace/docs';
const MOCK_HOME = '/home/user';

describe('expandPathForDisplay', () => {
  describe('tilde paths', () => {
    it('should expand ~/ to the OS home directory', () => {
      jest.spyOn(os, 'homedir').mockReturnValue(MOCK_HOME);

      expect(expandPathForDisplay('~/projects/app/main.ts', CONTEXT_FS_PATH)).toBe(
        `${MOCK_HOME}/projects/app/main.ts`,
      );
    });

    it('should expand ~/file.ts at root of home', () => {
      jest.spyOn(os, 'homedir').mockReturnValue(MOCK_HOME);

      expect(expandPathForDisplay('~/config.ts', CONTEXT_FS_PATH)).toBe(`${MOCK_HOME}/config.ts`);
    });

    it('should expand ~/ path containing spaces', () => {
      jest.spyOn(os, 'homedir').mockReturnValue(MOCK_HOME);

      expect(expandPathForDisplay('~/my projects/app/main.ts', CONTEXT_FS_PATH)).toBe(
        `${MOCK_HOME}/my projects/app/main.ts`,
      );
    });
  });

  describe('relative paths', () => {
    it('should resolve ./ relative to context directory', () => {
      expect(expandPathForDisplay('./src/file.ts', CONTEXT_FS_PATH)).toBe(
        `${CONTEXT_DIR}/src/file.ts`,
      );
    });

    it('should resolve ./ path containing spaces', () => {
      expect(expandPathForDisplay('./my components/button.tsx', CONTEXT_FS_PATH)).toBe(
        `${CONTEXT_DIR}/my components/button.tsx`,
      );
    });

    it('should resolve ../ relative to context directory', () => {
      expect(expandPathForDisplay('../lib/util.ts', CONTEXT_FS_PATH)).toBe(
        '/workspace/lib/util.ts',
      );
    });

    it('should resolve ../ path containing spaces', () => {
      expect(expandPathForDisplay('../shared lib/util.ts', CONTEXT_FS_PATH)).toBe(
        '/workspace/shared lib/util.ts',
      );
    });

    it('should resolve multiple ../ segments', () => {
      expect(expandPathForDisplay('../../shared/types.ts', CONTEXT_FS_PATH)).toBe(
        '/shared/types.ts',
      );
    });
  });

  describe('absolute paths', () => {
    it('should return absolute path unchanged', () => {
      expect(expandPathForDisplay('/path/to/file.ts', CONTEXT_FS_PATH)).toBe('/path/to/file.ts');
    });

    it('should return absolute path with spaces unchanged', () => {
      expect(expandPathForDisplay('/path/with spaces/file.ts', CONTEXT_FS_PATH)).toBe(
        '/path/with spaces/file.ts',
      );
    });
  });
});
