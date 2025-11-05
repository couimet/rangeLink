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
});
