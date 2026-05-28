import type * as vscode from 'vscode';

import type { PasteDestination } from '../../destinations';
import { isSameFileDestination } from '../../utils';

const createMockUri = (path: string): vscode.Uri =>
  ({
    toString: () => `file://${path}`,
  }) as vscode.Uri;

const createMockDestination = (
  uri: vscode.Uri | undefined,
  viewColumn?: vscode.ViewColumn,
): PasteDestination =>
  ({
    getDestinationUri: () => uri,
    getDestinationViewColumn: () => viewColumn,
  }) as PasteDestination;

describe('isSameFileDestination', () => {
  describe('when destination is undefined', () => {
    it('should return false', () => {
      const sourceUri = createMockUri('/workspace/src/file.ts');

      const result = isSameFileDestination(sourceUri, undefined);

      expect(result).toBe(false);
    });
  });

  describe('when destination has no URI (terminal, AI assistant)', () => {
    it('should return false for terminal destination', () => {
      const sourceUri = createMockUri('/workspace/src/file.ts');
      const destination = createMockDestination(undefined);

      const result = isSameFileDestination(sourceUri, destination);

      expect(result).toBe(false);
    });
  });

  describe('when destination has URI (text editor)', () => {
    it('should return true when source and destination URIs match', () => {
      const sourceUri = createMockUri('/workspace/src/file.ts');
      const destUri = createMockUri('/workspace/src/file.ts');
      const destination = createMockDestination(destUri);

      const result = isSameFileDestination(sourceUri, destination);

      expect(result).toBe(true);
    });

    it('should return false when URIs are different', () => {
      const sourceUri = createMockUri('/workspace/src/file.ts');
      const destUri = createMockUri('/workspace/src/other.ts');
      const destination = createMockDestination(destUri);

      const result = isSameFileDestination(sourceUri, destination);

      expect(result).toBe(false);
    });

    it('should return false when paths differ only in directory', () => {
      const sourceUri = createMockUri('/workspace/src/file.ts');
      const destUri = createMockUri('/workspace/test/file.ts');
      const destination = createMockDestination(destUri);

      const result = isSameFileDestination(sourceUri, destination);

      expect(result).toBe(false);
    });

    describe('view column awareness', () => {
      const URI = createMockUri('/workspace/src/file.ts');

      it('should return true when URIs match and view columns match', () => {
        const destination = createMockDestination(URI, 2);

        const result = isSameFileDestination(URI, destination, 2);

        expect(result).toBe(true);
      });

      it('should return false when URIs match but view columns differ', () => {
        const destination = createMockDestination(URI, 2);

        const result = isSameFileDestination(URI, destination, 3);

        expect(result).toBe(false);
      });

      it('should return true when URIs match and sourceViewColumn is not provided (backward compat)', () => {
        const destination = createMockDestination(URI, 2);

        const result = isSameFileDestination(URI, destination);

        expect(result).toBe(true);
      });

      it('should return true when URIs match and destination has no view column (backward compat)', () => {
        const destination = createMockDestination(URI, undefined);

        const result = isSameFileDestination(URI, destination, 2);

        expect(result).toBe(true);
      });
    });
  });
});
