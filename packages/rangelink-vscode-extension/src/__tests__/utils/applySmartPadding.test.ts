import { applySmartPadding } from '../../utils';

describe('applySmartPadding', () => {
  describe('Basic padding behavior', () => {
    it('should add leading and trailing spaces for text without padding', () => {
      expect(applySmartPadding('link')).toBe(' link ');
    });

    it('should preserve existing leading space', () => {
      expect(applySmartPadding(' link')).toBe(' link ');
    });

    it('should preserve existing trailing space', () => {
      expect(applySmartPadding('link ')).toBe(' link ');
    });

    it('should not add padding when text already has both leading and trailing spaces', () => {
      expect(applySmartPadding(' link ')).toBe(' link ');
    });
  });

  describe('Whitespace-only strings', () => {
    it('should preserve single space (already has leading and trailing whitespace)', () => {
      expect(applySmartPadding(' ')).toBe(' ');
    });

    it('should preserve multiple spaces', () => {
      expect(applySmartPadding('   ')).toBe('   ');
    });

    it('should preserve mixed whitespace', () => {
      expect(applySmartPadding(' \t\n ')).toBe(' \t\n ');
    });

    it('should add both leading and trailing space to empty string', () => {
      expect(applySmartPadding('')).toBe('  ');
    });
  });

  describe('Different whitespace types', () => {
    it('should handle text with tabs as whitespace', () => {
      expect(applySmartPadding('\tlink\t')).toBe('\tlink\t');
    });

    it('should handle text with newlines as whitespace', () => {
      expect(applySmartPadding('\nlink\n')).toBe('\nlink\n');
    });

    it('should add padding to text without leading/trailing tab', () => {
      expect(applySmartPadding('link\tmore')).toBe(' link\tmore ');
    });

    it('should handle carriage return as whitespace', () => {
      expect(applySmartPadding('\rlink\r')).toBe('\rlink\r');
    });
  });

  describe('Multiline text', () => {
    it('should add padding to multiline text without leading/trailing whitespace', () => {
      expect(applySmartPadding('line1\nline2')).toBe(' line1\nline2 ');
    });

    it('should preserve multiline text with leading newline', () => {
      expect(applySmartPadding('\nline1\nline2')).toBe('\nline1\nline2 ');
    });

    it('should preserve multiline text with trailing newline', () => {
      expect(applySmartPadding('line1\nline2\n')).toBe(' line1\nline2\n');
    });

    it('should preserve multiline text with both leading and trailing newlines', () => {
      expect(applySmartPadding('\nline1\nline2\n')).toBe('\nline1\nline2\n');
    });
  });

  describe('RangeLink formats', () => {
    it('should pad simple RangeLink', () => {
      expect(applySmartPadding('src/file.ts#L10')).toBe(' src/file.ts#L10 ');
    });

    it('should pad RangeLink with line range', () => {
      expect(applySmartPadding('src/file.ts#L10-L20')).toBe(' src/file.ts#L10-L20 ');
    });

    it('should pad RangeLink with column range', () => {
      expect(applySmartPadding('src/file.ts#L10C5-L20C10')).toBe(' src/file.ts#L10C5-L20C10 ');
    });

    it('should pad rectangular RangeLink', () => {
      expect(applySmartPadding('src/file.ts##L10C5-L20C10')).toBe(' src/file.ts##L10C5-L20C10 ');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long strings', () => {
      const longLink = 'src/' + 'a'.repeat(1000) + '.ts#L1000-L2000';
      expect(applySmartPadding(longLink)).toBe(` ${longLink} `);
    });

    it('should handle special characters in link', () => {
      const specialLink = 'src/file#123.ts##L10C5-L20C10';
      expect(applySmartPadding(specialLink)).toBe(` ${specialLink} `);
    });

    it('should handle unicode characters', () => {
      const unicodeLink = 'src/文件.ts#L10';
      expect(applySmartPadding(unicodeLink)).toBe(` ${unicodeLink} `);
    });

    it('should handle emoji in link', () => {
      const emojiLink = 'src/🚀file.ts#L10';
      expect(applySmartPadding(emojiLink)).toBe(` ${emojiLink} `);
    });

    it('should handle link with shell special characters', () => {
      const shellLink = 'src/file$var.ts#L10';
      expect(applySmartPadding(shellLink)).toBe(` ${shellLink} `);
    });

    it('should handle single character', () => {
      expect(applySmartPadding('a')).toBe(' a ');
    });

    it('should handle text with only internal spaces', () => {
      expect(applySmartPadding('link with spaces')).toBe(' link with spaces ');
    });
  });

  describe('Whitespace detection edge cases', () => {
    it('should detect leading space correctly', () => {
      expect(applySmartPadding(' text')).toBe(' text ');
    });

    it('should detect trailing space correctly', () => {
      expect(applySmartPadding('text ')).toBe(' text ');
    });

    it('should not add leading space when text starts with multiple spaces', () => {
      expect(applySmartPadding('   text')).toBe('   text ');
    });

    it('should not add trailing space when text ends with multiple spaces', () => {
      expect(applySmartPadding('text   ')).toBe(' text   ');
    });
  });

  describe('Padding modes', () => {
    describe('mode: both (default)', () => {
      it('should add both leading and trailing spaces when explicit', () => {
        expect(applySmartPadding('link', 'both')).toBe(' link ');
      });

      it('should use both as default when mode omitted', () => {
        expect(applySmartPadding('link')).toBe(' link ');
      });

      it('should preserve existing leading space', () => {
        expect(applySmartPadding(' link', 'both')).toBe(' link ');
      });

      it('should preserve existing trailing space', () => {
        expect(applySmartPadding('link ', 'both')).toBe(' link ');
      });

      it('should preserve whitespace-only strings', () => {
        expect(applySmartPadding('   ', 'both')).toBe('   ');
      });

      it('should add both spaces to empty string', () => {
        expect(applySmartPadding('', 'both')).toBe('  ');
      });
    });

    describe('mode: before', () => {
      it('should add only leading space', () => {
        expect(applySmartPadding('link', 'before')).toBe(' link');
      });

      it('should preserve existing leading space', () => {
        expect(applySmartPadding(' link', 'before')).toBe(' link');
      });

      it('should not add trailing space', () => {
        expect(applySmartPadding('link', 'before')).toBe(' link');
      });

      it('should preserve whitespace-only strings', () => {
        expect(applySmartPadding('   ', 'before')).toBe('   ');
      });

      it('should add leading space to empty string', () => {
        expect(applySmartPadding('', 'before')).toBe(' ');
      });
    });

    describe('mode: after', () => {
      it('should add only trailing space', () => {
        expect(applySmartPadding('link', 'after')).toBe('link ');
      });

      it('should not add leading space', () => {
        expect(applySmartPadding('link', 'after')).toBe('link ');
      });

      it('should preserve existing trailing space', () => {
        expect(applySmartPadding('link ', 'after')).toBe('link ');
      });

      it('should preserve whitespace-only strings', () => {
        expect(applySmartPadding('   ', 'after')).toBe('   ');
      });

      it('should add trailing space to empty string', () => {
        expect(applySmartPadding('', 'after')).toBe(' ');
      });
    });

    describe('mode: none', () => {
      it('should return text unchanged', () => {
        expect(applySmartPadding('link', 'none')).toBe('link');
      });

      it('should preserve existing leading space', () => {
        expect(applySmartPadding(' link', 'none')).toBe(' link');
      });

      it('should preserve existing trailing space', () => {
        expect(applySmartPadding('link ', 'none')).toBe('link ');
      });

      it('should preserve whitespace-only strings', () => {
        expect(applySmartPadding('   ', 'none')).toBe('   ');
      });

      it('should preserve empty string', () => {
        expect(applySmartPadding('', 'none')).toBe('');
      });

      it('should preserve text with both leading and trailing spaces', () => {
        expect(applySmartPadding(' link ', 'none')).toBe(' link ');
      });
    });
  });
});
