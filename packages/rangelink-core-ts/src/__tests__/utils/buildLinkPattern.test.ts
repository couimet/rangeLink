import { DEFAULT_DELIMITERS } from '../../constants/DEFAULT_DELIMITERS';
import { DelimiterConfig } from '../../types/DelimiterConfig';
import { buildLinkPattern } from '../../utils/buildLinkPattern';

describe('buildLinkPattern', () => {
  describe('default delimiters', () => {
    const pattern = buildLinkPattern(DEFAULT_DELIMITERS);

    it('should have global flag enabled', () => {
      expect(pattern.global).toBe(true);
    });

    it('should match single line link', () => {
      const line = 'Check file.ts#L10 for details';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('file.ts#L10');
      expect(matches[0][1]).toBe('file.ts'); // path
      expect(matches[0][2]).toBe('#'); // hash
    });

    it('should match multi-line link', () => {
      const line = 'Error in src/auth.ts#L10-L20';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('src/auth.ts#L10-L20');
      expect(matches[0][1]).toBe('src/auth.ts'); // path
      expect(matches[0][2]).toBe('#'); // hash
      expect(matches[0][3]).toBe('10'); // start line
    });

    it('should match link with columns', () => {
      const line = 'Found at file.ts#L10C5-L20C10';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('file.ts#L10C5-L20C10');
      expect(matches[0][1]).toBe('file.ts'); // path
      expect(matches[0][2]).toBe('#'); // hash
      expect(matches[0][3]).toBe('10'); // start line
      expect(matches[0][4]).toBe('5'); // start char
    });

    it('should match rectangular mode link', () => {
      const line = 'See data.csv##L10C5-L20C10';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('data.csv##L10C5-L20C10');
      expect(matches[0][1]).toBe('data.csv'); // path
      expect(matches[0][2]).toBe('##'); // double hash
    });

    it('should match hash in filename', () => {
      const line = 'Error in file#1.ts#L10';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('file#1.ts#L10');
      expect(matches[0][1]).toBe('file#1.ts'); // path with hash
      expect(matches[0][2]).toBe('#'); // hash delimiter
    });

    it('should match multiple hashes in filename', () => {
      const line = 'Check issue#123#fix.ts#L42C5';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('issue#123#fix.ts#L42C5');
      expect(matches[0][1]).toBe('issue#123#fix.ts'); // path with hashes
    });

    it('should match hash in directory name', () => {
      const line = 'File at issue#123/auth.ts#L42';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('issue#123/auth.ts#L42');
      expect(matches[0][1]).toBe('issue#123/auth.ts'); // path with hash in dir
    });

    it('should match multiple links in one line', () => {
      const line = 'Compare file1.ts#L10 with file2.ts#L20';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(2);
      expect(matches[0][0]).toBe('file1.ts#L10');
      expect(matches[0][1]).toBe('file1.ts');
      expect(matches[1][0]).toBe('file2.ts#L20');
      expect(matches[1][1]).toBe('file2.ts');
    });

    it('should match links with long paths', () => {
      const line = 'src/components/auth/utils/validation/email.ts#L42';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('src/components/auth/utils/validation/email.ts#L42');
      expect(matches[0][1]).toBe('src/components/auth/utils/validation/email.ts');
    });

    it('should not match invalid format without line number', () => {
      const line = 'Check file.ts#L';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(0);
    });

    it('should not match link without hash separator', () => {
      const line = 'Check file.ts for details';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(0);
    });
  });

  describe('custom single-character delimiters', () => {
    it('should match with @ as hash delimiter', () => {
      const delimiters: DelimiterConfig = {
        hash: '@',
        line: 'L',
        position: 'C',
        range: '-',
      };
      const pattern = buildLinkPattern(delimiters);
      const line = 'Check file.ts@L10';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('file.ts@L10');
      expect(matches[0][1]).toBe('file.ts');
      expect(matches[0][2]).toBe('@');
    });

    it('should match with custom line delimiter', () => {
      const delimiters: DelimiterConfig = {
        hash: '#',
        line: 'l',
        position: 'C',
        range: '-',
      };
      const pattern = buildLinkPattern(delimiters);
      const line = 'Check file.ts#l10';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('file.ts#l10');
    });

    it('should match with all custom single-char delimiters', () => {
      const delimiters: DelimiterConfig = {
        hash: '@',
        line: 'l',
        position: 'p',
        range: ':',
      };
      const pattern = buildLinkPattern(delimiters);
      const line = 'Check file.ts@l10p5:l20p10';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('file.ts@l10p5:l20p10');
      expect(matches[0][1]).toBe('file.ts');
      expect(matches[0][2]).toBe('@');
      expect(matches[0][3]).toBe('10'); // start line
      expect(matches[0][4]).toBe('5'); // start char
    });

    it('should match rectangular mode with custom hash', () => {
      const delimiters: DelimiterConfig = {
        hash: '@',
        line: 'L',
        position: 'C',
        range: '-',
      };
      const pattern = buildLinkPattern(delimiters);
      const line = 'Check file.ts@@L10C5';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('file.ts@@L10C5');
      expect(matches[0][2]).toBe('@@'); // double hash
    });
  });

  describe('custom multi-character delimiters', () => {
    it('should match with >> as hash delimiter', () => {
      const delimiters: DelimiterConfig = {
        hash: '>>',
        line: 'L',
        position: 'C',
        range: '-',
      };
      const pattern = buildLinkPattern(delimiters);
      const line = 'Check file.ts>>L10';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('file.ts>>L10');
      expect(matches[0][1]).toBe('file.ts');
      expect(matches[0][2]).toBe('>>');
    });

    it('should match with all multi-char delimiters', () => {
      const delimiters: DelimiterConfig = {
        hash: '>>',
        line: 'line',
        position: 'pos',
        range: 'thru',
      };
      const pattern = buildLinkPattern(delimiters);
      const line = 'Check file.ts>>line10pos5thruline20pos10';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('file.ts>>line10pos5thruline20pos10');
      expect(matches[0][1]).toBe('file.ts');
      expect(matches[0][2]).toBe('>>');
    });

    it('should match rectangular mode with multi-char hash', () => {
      const delimiters: DelimiterConfig = {
        hash: '>>',
        line: 'L',
        position: 'C',
        range: '-',
      };
      const pattern = buildLinkPattern(delimiters);
      const line = 'Check file.ts>>>>L10C5';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('file.ts>>>>L10C5');
      expect(matches[0][2]).toBe('>>>>'); // double hash (4 chars)
    });

    it('should not allow multi-char hash in filename', () => {
      const delimiters: DelimiterConfig = {
        hash: '>>',
        line: 'L',
        position: 'C',
        range: '-',
      };
      const pattern = buildLinkPattern(delimiters);
      const line = 'Check file>>1.ts>>L10'; // >> in filename
      const matches = [...line.matchAll(pattern)];

      // With negative lookahead, this should not match or match incorrectly
      // This is the documented trade-off: multi-char delimiters can't be in filenames
      if (matches.length > 0) {
        expect(matches[0][1]).not.toBe('file>>1.ts');
      }
    });

    it('should handle multiple links with multi-char delimiters', () => {
      const delimiters: DelimiterConfig = {
        hash: '>>',
        line: 'L',
        position: 'C',
        range: '-',
      };
      const pattern = buildLinkPattern(delimiters);
      const line = 'Compare file1.ts>>L10 with file2.ts>>L20';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(2);
      expect(matches[0][0]).toBe('file1.ts>>L10');
      expect(matches[1][0]).toBe('file2.ts>>L20');
    });
  });

  describe('regex special characters', () => {
    it('should escape dot delimiter', () => {
      const delimiters: DelimiterConfig = {
        hash: '.',
        line: 'L',
        position: 'C',
        range: '-',
      };
      const pattern = buildLinkPattern(delimiters);
      const line = 'Check file.txt.L10';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('file.txt.L10');
      expect(matches[0][2]).toBe('.');
    });

    it('should escape plus delimiter', () => {
      const delimiters: DelimiterConfig = {
        hash: '+',
        line: 'L',
        position: 'C',
        range: '-',
      };
      const pattern = buildLinkPattern(delimiters);
      const line = 'Check file.ts+L10';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('file.ts+L10');
      expect(matches[0][2]).toBe('+');
    });

    it('should escape asterisk delimiter', () => {
      const delimiters: DelimiterConfig = {
        hash: '*',
        line: 'L',
        position: 'C',
        range: '-',
      };
      const pattern = buildLinkPattern(delimiters);
      const line = 'Check file.ts*L10';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('file.ts*L10');
      expect(matches[0][2]).toBe('*');
    });

    it('should escape pipe delimiter', () => {
      const delimiters: DelimiterConfig = {
        hash: '|',
        line: 'L',
        position: 'C',
        range: '-',
      };
      const pattern = buildLinkPattern(delimiters);
      const line = 'Check file.ts|L10';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('file.ts|L10');
      expect(matches[0][2]).toBe('|');
    });

    it('should escape question mark delimiter', () => {
      const delimiters: DelimiterConfig = {
        hash: '?',
        line: 'L',
        position: 'C',
        range: '-',
      };
      const pattern = buildLinkPattern(delimiters);
      const line = 'Check file.ts?L10';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('file.ts?L10');
      expect(matches[0][2]).toBe('?');
    });

    it('should escape parentheses in range delimiter', () => {
      const delimiters: DelimiterConfig = {
        hash: '#',
        line: 'L',
        position: 'C',
        range: '(to)',
      };
      const pattern = buildLinkPattern(delimiters);
      const line = 'Check file.ts#L10(to)L20';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('file.ts#L10(to)L20');
    });
  });

  describe('URL handling', () => {
    const pattern = buildLinkPattern(DEFAULT_DELIMITERS);

    describe('web URLs are excluded at pattern level', () => {
      it('should NOT match https:// URLs', () => {
        const line = 'Check https://github.com/org/repo/file.ts#L10';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(0);
      });

      it('should NOT match http:// URLs', () => {
        const line = 'See http://example.com/file.ts#L5 for details';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(0);
      });

      it('should NOT match ftp:// URLs', () => {
        const line = 'Download from ftp://server.com/file.ts#L10';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(0);
      });

      it('should NOT match HTTPS:// URLs (uppercase)', () => {
        const line = 'Check HTTPS://GITHUB.COM/FILE.TS#L10';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(0);
      });

      it('should NOT match GitHub permalinks with query params', () => {
        const line =
          'https://github.com/nextjs/deploy-github-pages/blob/main/README.md?plain=1#L3-L9';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(0);
      });

      it('should match only local link when line has both URL and local link', () => {
        const line = 'Compare https://github.com/file.ts#L5 with local.ts#L10';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('local.ts#L10');
      });
    });

    describe('file:// URLs are allowed (local file references)', () => {
      it('should match file:// URLs', () => {
        const line = 'Open file:///Users/name/file.ts#L10';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('file:///Users/name/file.ts#L10');
      });
    });

    describe('domain-like paths are allowed (could be local directories)', () => {
      it('should match github.com/... paths (could be local directory)', () => {
        const line = 'Check github.com/org/repo/file.ts#L10';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('github.com/org/repo/file.ts#L10');
      });

      it('should match example.io/... paths', () => {
        const line = 'See example.io/path/file.ts#L5';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('example.io/path/file.ts#L5');
      });
    });

    describe('local paths', () => {
      it('should match Windows paths with drive letters', () => {
        const line = 'Check C:\\Users\\name\\file.ts#L10';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('C:\\Users\\name\\file.ts#L10');
      });

      it('should match local paths that look like domains but have leading dot or slash', () => {
        const line = 'See ./github.com/local/file.ts#L10';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('./github.com/local/file.ts#L10');
      });

      it('should match absolute local paths', () => {
        const line = 'Check /Users/name/project/file.ts#L42';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('/Users/name/project/file.ts#L42');
      });

      it('should match paths with HTTP-like names (HttpClient.ts)', () => {
        const line = 'See HttpClient.ts#L10 for the implementation';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('HttpClient.ts#L10');
      });
    });
  });

  describe('edge cases', () => {
    it('should match link at start of line', () => {
      const pattern = buildLinkPattern(DEFAULT_DELIMITERS);
      const line = 'file.ts#L10 is where the error occurs';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('file.ts#L10');
    });

    it('should match link at end of line', () => {
      const pattern = buildLinkPattern(DEFAULT_DELIMITERS);
      const line = 'Error at file.ts#L10';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('file.ts#L10');
    });

    it('should not match empty string', () => {
      const pattern = buildLinkPattern(DEFAULT_DELIMITERS);
      const line = '';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(0);
    });

    it('should not match whitespace only', () => {
      const pattern = buildLinkPattern(DEFAULT_DELIMITERS);
      const line = '   ';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(0);
    });

    it('should match links with special path characters', () => {
      const pattern = buildLinkPattern(DEFAULT_DELIMITERS);
      const line = 'src/foo-bar_baz.test.ts#L10';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('src/foo-bar_baz.test.ts#L10');
      expect(matches[0][1]).toBe('src/foo-bar_baz.test.ts');
    });

    it('should match Windows-style paths', () => {
      const pattern = buildLinkPattern(DEFAULT_DELIMITERS);
      const line = 'C:\\Users\\foo\\file.ts#L10';
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe('C:\\Users\\foo\\file.ts');
    });

    it('should reset lastIndex on each matchAll call', () => {
      const pattern = buildLinkPattern(DEFAULT_DELIMITERS);
      const line = 'file1.ts#L10 file2.ts#L20';

      // Call matchAll multiple times
      const matches1 = [...line.matchAll(pattern)];
      const matches2 = [...line.matchAll(pattern)];

      expect(matches1).toHaveLength(2);
      expect(matches2).toHaveLength(2);
      expect(matches1[0][0]).toBe(matches2[0][0]);
    });

    it('should match very long paths', () => {
      const pattern = buildLinkPattern(DEFAULT_DELIMITERS);
      const longPath = 'a/'.repeat(50) + 'file.ts';
      const line = `${longPath}#L10`;
      const matches = [...line.matchAll(pattern)];

      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe(longPath);
    });
  });

  describe('wrapper character handling', () => {
    const pattern = buildLinkPattern(DEFAULT_DELIMITERS);

    describe('backtick wrapping', () => {
      it('should match link wrapped in backticks without capturing backticks', () => {
        const line = '`file.ts#L10`';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('file.ts#L10');
        expect(matches[0][1]).toBe('file.ts');
      });

      it('should match range link wrapped in backticks', () => {
        const line = '`path/to/file.ts#L10-L20`';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('path/to/file.ts#L10-L20');
        expect(matches[0][1]).toBe('path/to/file.ts');
      });

      it('should match inline code in prose', () => {
        const line = 'Check `file.ts#L10` for details';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('file.ts#L10');
        expect(matches[0][1]).toBe('file.ts');
      });

      it('should match multiple backtick-wrapped links', () => {
        const line = 'Compare `file1.ts#L10` with `file2.ts#L20`';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(2);
        expect(matches[0][0]).toBe('file1.ts#L10');
        expect(matches[1][0]).toBe('file2.ts#L20');
      });

      it('should exclude leading backtick when only on one side', () => {
        const line = '`file.ts#L10 is broken';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('file.ts#L10');
        expect(matches[0][1]).toBe('file.ts');
      });

      it('should exclude trailing backtick when only on one side', () => {
        const line = 'see file.ts#L10`';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('file.ts#L10');
        expect(matches[0][1]).toBe('file.ts');
      });

      it('should match link inside triple backtick fencing', () => {
        const line = '```file.ts#L10```';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('file.ts#L10');
        expect(matches[0][1]).toBe('file.ts');
      });

      it('should match backtick-wrapped link with columns', () => {
        const line = '`src/auth.ts#L10C5-L20C10`';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('src/auth.ts#L10C5-L20C10');
        expect(matches[0][1]).toBe('src/auth.ts');
      });

      it('should match backtick-wrapped link with multi-char hash delimiter', () => {
        const delimiters: DelimiterConfig = {
          hash: '>>',
          line: 'L',
          position: 'C',
          range: '-',
        };
        const multiCharPattern = buildLinkPattern(delimiters);
        const line = '`file.ts>>L10`';
        const matches = [...line.matchAll(multiCharPattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('file.ts>>L10');
        expect(matches[0][1]).toBe('file.ts');
      });
    });

    describe('single quote wrapping', () => {
      it('should match link wrapped in single quotes', () => {
        const line = "'file.ts#L10'";
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('file.ts#L10');
        expect(matches[0][1]).toBe('file.ts');
      });

      it('should match single-quoted link in prose', () => {
        const line = "Check 'file.ts#L10' for details";
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('file.ts#L10');
        expect(matches[0][1]).toBe('file.ts');
      });
    });

    describe('double quote wrapping', () => {
      it('should match link wrapped in double quotes', () => {
        const line = '"file.ts#L10"';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('file.ts#L10');
        expect(matches[0][1]).toBe('file.ts');
      });

      it('should match double-quoted link in prose', () => {
        const line = 'Check "file.ts#L10" for details';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('file.ts#L10');
        expect(matches[0][1]).toBe('file.ts');
      });
    });

    describe('angle bracket wrapping', () => {
      it('should match link wrapped in angle brackets', () => {
        const line = '<file.ts#L10>';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('file.ts#L10');
        expect(matches[0][1]).toBe('file.ts');
      });

      it('should match angle-bracketed link in prose', () => {
        const line = 'See <file.ts#L10> for the implementation';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('file.ts#L10');
        expect(matches[0][1]).toBe('file.ts');
      });
    });

    describe('parentheses and brackets are NOT excluded (appear in real paths)', () => {
      it('should capture leading parenthesis as part of path', () => {
        const line = '(file.ts#L10)';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][1]).toBe('(file.ts');
      });

      it('should capture leading bracket as part of path', () => {
        const line = '[file.ts#L10]';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(1);
        expect(matches[0][1]).toBe('[file.ts');
      });
    });

    describe('mixed wrapper scenarios', () => {
      it('should handle different wrapper types in same line', () => {
        const line = 'Compare `file1.ts#L10` with "file2.ts#L20"';
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(2);
        expect(matches[0][0]).toBe('file1.ts#L10');
        expect(matches[1][0]).toBe('file2.ts#L20');
      });

      it('should handle all excluded wrapper types in one line', () => {
        const line = "`a.ts#L1` 'b.ts#L2' \"c.ts#L3\" <d.ts#L4>";
        const matches = [...line.matchAll(pattern)];

        expect(matches).toHaveLength(4);
        expect(matches[0][0]).toBe('a.ts#L1');
        expect(matches[0][1]).toBe('a.ts');
        expect(matches[1][0]).toBe('b.ts#L2');
        expect(matches[1][1]).toBe('b.ts');
        expect(matches[2][0]).toBe('c.ts#L3');
        expect(matches[2][1]).toBe('c.ts');
        expect(matches[3][0]).toBe('d.ts#L4');
        expect(matches[3][1]).toBe('d.ts');
      });
    });
  });
});
