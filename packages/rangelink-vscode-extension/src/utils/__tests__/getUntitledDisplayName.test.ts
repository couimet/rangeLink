import { createMockUntitledUri } from '../../__tests__/helpers/createMockUntitledUri';
import { getUntitledDisplayName } from '..';

describe('getUntitledDisplayName', () => {
  describe('valid untitled URIs', () => {
    it('should handle test format: untitled:/1 → "Untitled-1"', () => {
      const uri = createMockUntitledUri('untitled:/1');

      const result = getUntitledDisplayName(uri);

      expect(result).toBe('Untitled-1');
    });

    it('should handle test format: untitled:/2 → "Untitled-2"', () => {
      const uri = createMockUntitledUri('untitled:/2');

      const result = getUntitledDisplayName(uri);

      expect(result).toBe('Untitled-2');
    });

    it('should handle actual format: untitled:Untitled-1 → "Untitled-1" (no duplication)', () => {
      const uri = createMockUntitledUri('untitled:Untitled-1');

      const result = getUntitledDisplayName(uri);

      expect(result).toBe('Untitled-1');
    });

    it('should handle actual format: untitled:Untitled-2 → "Untitled-2" (no duplication)', () => {
      const uri = createMockUntitledUri('untitled:Untitled-2');

      const result = getUntitledDisplayName(uri);

      expect(result).toBe('Untitled-2');
    });

    it('should handle format without leading slash: untitled:42 → "Untitled-42"', () => {
      const uri = createMockUntitledUri('untitled:42');

      const result = getUntitledDisplayName(uri);

      expect(result).toBe('Untitled-42');
    });

    it('should handle lowercase prefix: untitled:untitled-3 → "untitled-3" (case-insensitive)', () => {
      const uri = createMockUntitledUri('untitled:untitled-3');

      const result = getUntitledDisplayName(uri);

      // Case-insensitive match: lowercase "untitled" matches "Untitled", no prefix added
      expect(result).toBe('untitled-3');
    });
  });

  describe('error cases', () => {
    it('should throw error for non-untitled scheme', () => {
      const uri = createMockUntitledUri('file:/workspace/file.ts');

      expect(() => getUntitledDisplayName(uri)).toThrow('Expected untitled scheme, got: file');
    });

    it('should throw error for http scheme', () => {
      const uri = createMockUntitledUri('http://example.com');

      expect(() => getUntitledDisplayName(uri)).toThrow('Expected untitled scheme, got: http');
    });
  });
});
