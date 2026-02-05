import type * as vscode from 'vscode';

import type { PasteDestination } from '../../destinations';
import { isSelfPaste } from '../../utils';

const createMockUri = (path: string): vscode.Uri =>
  ({
    toString: () => `file://${path}`,
  }) as vscode.Uri;

const createMockDestination = (uri: vscode.Uri | undefined): PasteDestination =>
  ({
    getDestinationUri: () => uri,
  }) as PasteDestination;

describe('isSelfPaste', () => {
  describe('when destination is undefined', () => {
    it('should return false', () => {
      const sourceUri = createMockUri('/workspace/src/file.ts');

      const result = isSelfPaste(sourceUri, undefined);

      expect(result).toBe(false);
    });
  });

  describe('when destination has no URI (terminal, AI assistant)', () => {
    it('should return false for terminal destination', () => {
      const sourceUri = createMockUri('/workspace/src/file.ts');
      const destination = createMockDestination(undefined);

      const result = isSelfPaste(sourceUri, destination);

      expect(result).toBe(false);
    });
  });

  describe('when destination has URI (text editor)', () => {
    it('should return true when source and destination URIs match', () => {
      const sourceUri = createMockUri('/workspace/src/file.ts');
      const destUri = createMockUri('/workspace/src/file.ts');
      const destination = createMockDestination(destUri);

      const result = isSelfPaste(sourceUri, destination);

      expect(result).toBe(true);
    });

    it('should return false when URIs are different', () => {
      const sourceUri = createMockUri('/workspace/src/file.ts');
      const destUri = createMockUri('/workspace/src/other.ts');
      const destination = createMockDestination(destUri);

      const result = isSelfPaste(sourceUri, destination);

      expect(result).toBe(false);
    });

    it('should return false when paths differ only in directory', () => {
      const sourceUri = createMockUri('/workspace/src/file.ts');
      const destUri = createMockUri('/workspace/test/file.ts');
      const destination = createMockDestination(destUri);

      const result = isSelfPaste(sourceUri, destination);

      expect(result).toBe(false);
    });
  });
});
