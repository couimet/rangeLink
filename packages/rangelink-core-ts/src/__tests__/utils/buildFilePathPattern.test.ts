import { DEFAULT_DELIMITERS } from '../../constants/DEFAULT_DELIMITERS';
import { buildFilePathPattern, extractFilePath } from '../../utils/buildLinkPattern';
import {
  BOUNDARY_INPUTS,
  MULTI_MATCH_INPUTS,
  PROSE_INPUTS,
  QUOTED_FALSE_POSITIVES,
  QUOTED_TRUE_POSITIVES,
  RANGELINK_COEXISTENCE,
  SPECIAL_CHAR_PATHS,
  URL_INPUTS,
} from '../fixtures/pathPatternInputs';

const matchesPattern = (text: string): string[] => {
  const pattern = buildFilePathPattern(DEFAULT_DELIMITERS);
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    results.push(extractFilePath(match));
  }
  return results;
};

describe('buildFilePathPattern', () => {
  it('should have global flag enabled', () => {
    expect(buildFilePathPattern(DEFAULT_DELIMITERS).global).toBe(true);
  });

  describe('quoted paths — true positives', () => {
    it('should match double-quoted absolute path', () => {
      expect(matchesPattern(QUOTED_TRUE_POSITIVES.DOUBLE_ABSOLUTE)).toStrictEqual([
        '/path/to/file.ts',
      ]);
    });

    it('should match single-quoted absolute path', () => {
      expect(matchesPattern(QUOTED_TRUE_POSITIVES.SINGLE_ABSOLUTE)).toStrictEqual([
        '/path/to/file.ts',
      ]);
    });

    it('should match double-quoted path with spaces', () => {
      expect(matchesPattern(QUOTED_TRUE_POSITIVES.DOUBLE_WITH_SPACES)).toStrictEqual([
        '/path/with spaces/file.ts',
      ]);
    });

    it('should match single-quoted path with spaces', () => {
      expect(matchesPattern(QUOTED_TRUE_POSITIVES.SINGLE_WITH_SPACES)).toStrictEqual([
        '/path/with spaces/file.ts',
      ]);
    });

    it('should match double-quoted multi-extension path and capture last extension', () => {
      expect(matchesPattern(QUOTED_TRUE_POSITIVES.DOUBLE_MULTI_EXTENSION)).toStrictEqual([
        '/path/to/file.test.ts',
      ]);
    });

    it('should match single-quoted path when possessive apostrophe appears earlier in sentence', () => {
      expect(
        matchesPattern(QUOTED_TRUE_POSITIVES.POSSESSIVE_BEFORE_SINGLE_QUOTED_PATH),
      ).toStrictEqual(['/path/to/out.ts']);
    });

    it('should match double-quoted path when possessives surround the quoted expression', () => {
      expect(
        matchesPattern(QUOTED_TRUE_POSITIVES.POSSESSIVES_SURROUNDING_DOUBLE_QUOTED_PATH),
      ).toStrictEqual(['/path/to/file.ts']);
    });
  });

  describe('quoted paths — false positives', () => {
    it('should NOT match single-quoted string containing a question mark', () => {
      expect(matchesPattern(QUOTED_FALSE_POSITIVES.SINGLE_QUESTION_MARK)).toStrictEqual([]);
    });

    it('should NOT match double-quoted glob pattern containing an asterisk', () => {
      expect(matchesPattern(QUOTED_FALSE_POSITIVES.DOUBLE_GLOB_PATTERN)).toStrictEqual([]);
    });

    it('should NOT match single-quoted prose fragment with no file extension', () => {
      expect(matchesPattern(QUOTED_FALSE_POSITIVES.SINGLE_NO_EXTENSION)).toStrictEqual([]);
    });

    it('should NOT match double-quoted prose phrase with no file extension', () => {
      expect(matchesPattern(QUOTED_FALSE_POSITIVES.DOUBLE_NO_EXTENSION)).toStrictEqual([]);
    });

    it('should NOT match single-quoted bare filename without path separator', () => {
      expect(matchesPattern(QUOTED_FALSE_POSITIVES.SINGLE_BARE_FILENAME)).toStrictEqual([]);
    });

    it('should NOT match double-quoted bare filename without path separator', () => {
      expect(matchesPattern(QUOTED_FALSE_POSITIVES.DOUBLE_BARE_FILENAME)).toStrictEqual([]);
    });

    it('should NOT match double-quoted ORM-style class.operation string', () => {
      expect(matchesPattern(QUOTED_FALSE_POSITIVES.DOUBLE_ORM_QUERY)).toStrictEqual([]);
    });

    it('should NOT match single-quoted ORM-style class.operation string', () => {
      expect(matchesPattern(QUOTED_FALSE_POSITIVES.SINGLE_ORM_QUERY)).toStrictEqual([]);
    });

    it('should NOT span across newline — the valid quoted path on the second line should match independently', () => {
      expect(
        matchesPattern(QUOTED_FALSE_POSITIVES.NEWLINE_BETWEEN_POSSESSIVES_WITH_VALID_SECOND_LINE),
      ).toStrictEqual(['/path/to/file.ts']);
    });
  });

  describe('prose apostrophes — false positives', () => {
    it('should NOT match possessive apostrophes with backtick code between them', () => {
      expect(matchesPattern(PROSE_INPUTS.POSSESSIVES_WITH_BACKTICK_CODE)).toStrictEqual([]);
    });

    it('should NOT match possessive span where extension-like text is followed by a space, not a closing quote', () => {
      expect(matchesPattern(PROSE_INPUTS.POSSESSIVES_SPACE_AFTER_EXTENSION)).toStrictEqual([]);
    });

    it('should NOT match a lone possessive with no second apostrophe on the line', () => {
      expect(matchesPattern(PROSE_INPUTS.LONE_POSSESSIVE)).toStrictEqual([]);
    });

    it('should match the unquoted relative path when a contraction appears earlier on the same line', () => {
      expect(matchesPattern(PROSE_INPUTS.CONTRACTION_WITH_VALID_RELATIVE_PATH)).toStrictEqual([
        './src/component.tsx',
      ]);
    });
  });

  describe('absolute paths', () => {
    it('should match absolute path', () => {
      expect(matchesPattern('See /path/to/file.ts for details')).toStrictEqual([
        '/path/to/file.ts',
      ]);
    });

    it('should match absolute path with hyphens and dots in name', () => {
      expect(matchesPattern(SPECIAL_CHAR_PATHS.MULTI_EXTENSION)).toStrictEqual([
        '/path/to/my-file.test.ts',
      ]);
    });

    it('should match absolute path with @ in path component', () => {
      expect(matchesPattern(SPECIAL_CHAR_PATHS.AT_IN_COMPONENT)).toStrictEqual([
        '/home/user@hostname/project/file.ts',
      ]);
    });

    it('should match absolute path with dot in directory name (version directory)', () => {
      expect(matchesPattern(SPECIAL_CHAR_PATHS.DOT_IN_DIRECTORY)).toStrictEqual([
        '/path/to/v1.2/config.ts',
      ]);
    });

    it('should match absolute path for dotfile', () => {
      expect(matchesPattern(SPECIAL_CHAR_PATHS.DOTFILE_ABSOLUTE)).toStrictEqual([
        '/repo/.eslintrc.js',
      ]);
    });

    it('should match absolute path with numeric extension', () => {
      expect(matchesPattern(SPECIAL_CHAR_PATHS.EXTENSION_DIGITS)).toStrictEqual([
        '/path/to/output.mp4',
      ]);
    });

    it('should match absolute path with numbers in filename', () => {
      expect(matchesPattern(SPECIAL_CHAR_PATHS.NUMBERS_IN_FILENAME)).toStrictEqual([
        '/path/to/script2.sh',
      ]);
    });
  });

  describe('relative paths', () => {
    it('should match ./ relative path', () => {
      expect(matchesPattern('Check ./src/file.ts please')).toStrictEqual(['./src/file.ts']);
    });

    it('should match ../ relative path', () => {
      expect(matchesPattern('Check ../lib/util.ts please')).toStrictEqual(['../lib/util.ts']);
    });

    it('should match relative path with dot in directory name', () => {
      expect(matchesPattern(SPECIAL_CHAR_PATHS.DOT_IN_DIRECTORY_RELATIVE)).toStrictEqual([
        './src/v1.2/utils/helper.ts',
      ]);
    });

    it('should match ./ shell script', () => {
      expect(matchesPattern(SPECIAL_CHAR_PATHS.SHELL_SCRIPT_RELATIVE)).toStrictEqual([
        './deploy.sh',
      ]);
    });
  });

  describe('tilde paths', () => {
    it('should match ~/path', () => {
      expect(matchesPattern('Open ~/projects/app/main.ts now')).toStrictEqual([
        '~/projects/app/main.ts',
      ]);
    });

    it('should match ~/path with yaml extension', () => {
      expect(matchesPattern(SPECIAL_CHAR_PATHS.YAML_TILDE)).toStrictEqual([
        '~/config/settings.yaml',
      ]);
    });
  });

  describe('URL exclusion — should NOT match', () => {
    it('should NOT match https:// URL', () => {
      expect(matchesPattern(URL_INPUTS.HTTPS_NO_HASH)).toStrictEqual([]);
    });

    it('should NOT match https:// URL with file extension', () => {
      expect(matchesPattern(URL_INPUTS.HTTPS_CDN_NO_HASH)).toStrictEqual([]);
    });

    it('should NOT match ftp:// URL', () => {
      expect(matchesPattern(URL_INPUTS.FTP_NO_HASH)).toStrictEqual([]);
    });

    it('should NOT match http://localhost URL', () => {
      expect(matchesPattern(URL_INPUTS.LOCALHOST_NO_HASH)).toStrictEqual([]);
    });

    it('should NOT match absolute path inside a web URL', () => {
      expect(matchesPattern('See https://example.com/path/file.ts for info')).toStrictEqual([]);
    });

    it('should NOT match domain-prefixed path (dot before slash triggers lookbehind)', () => {
      expect(matchesPattern(URL_INPUTS.DOMAIN_PREFIXED_NO_HASH)).toStrictEqual([]);
    });

    it('should NOT match path preceded by word characters', () => {
      expect(matchesPattern('domain.com/path/file.ts')).toStrictEqual([]);
    });

    it('should NOT match double-quoted https:// URL', () => {
      expect(matchesPattern('"https://example.com/file.ts"')).toStrictEqual([]);
    });

    it('should NOT match single-quoted https:// URL', () => {
      expect(matchesPattern("'https://example.com/file.ts'")).toStrictEqual([]);
    });

    it('should NOT match relative path segment inside https:// URL', () => {
      expect(matchesPattern('https://example.com/./file.ts')).toStrictEqual([]);
    });

    it('should NOT match tilde path segment inside https:// URL', () => {
      expect(matchesPattern('https://example.com/~user/file.ts')).toStrictEqual([]);
    });
  });

  describe('boundary and context', () => {
    it('should match absolute path after a comma', () => {
      expect(matchesPattern(BOUNDARY_INPUTS.PATH_AFTER_COMMA)).toStrictEqual(['/path/to/file.ts']);
    });

    it('should match absolute path after a colon-label', () => {
      expect(matchesPattern(BOUNDARY_INPUTS.PATH_AFTER_COLON_LABEL)).toStrictEqual([
        '/path/to/file.ts',
      ]);
    });

    it('should match absolute path wrapped in backticks without capturing backtick', () => {
      expect(matchesPattern(BOUNDARY_INPUTS.ABS_PATH_IN_BACKTICKS)).toStrictEqual([
        '/path/to/file.ts',
      ]);
    });

    it('should match single-quoted dotfile and capture full path', () => {
      expect(matchesPattern(SPECIAL_CHAR_PATHS.DOTFILE_SINGLE_QUOTED)).toStrictEqual([
        '/path/.gitignore',
      ]);
    });
  });

  describe('wrapper characters', () => {
    it('should match absolute path inside ()', () => {
      expect(matchesPattern('see (/path/to/file.ts) for more')).toStrictEqual(['/path/to/file.ts']);
    });

    it('should match relative path inside markdown link (./path)', () => {
      expect(matchesPattern('[label](./src/component.ts)')).toStrictEqual(['./src/component.ts']);
    });

    it('should match absolute path inside {}', () => {
      expect(matchesPattern('ref: {/path/to/file.ts}')).toStrictEqual(['/path/to/file.ts']);
    });

    it('should match absolute path inside []', () => {
      expect(matchesPattern('file: [/path/to/file.ts]')).toStrictEqual(['/path/to/file.ts']);
    });
  });

  describe('non-matching patterns', () => {
    it('should NOT match bare relative path without ./ prefix', () => {
      expect(matchesPattern('src/file.ts')).toStrictEqual([]);
    });

    it('should NOT match plain text without extension', () => {
      expect(matchesPattern('no paths here at all')).toStrictEqual([]);
    });

    it('should NOT match English possessive apostrophes as quote delimiters', () => {
      expect(matchesPattern(PROSE_INPUTS.POSSESSIVES_WITH_BACKTICK_CODE)).toStrictEqual([]);
    });
  });

  describe('RangeLink coexistence', () => {
    it('should NOT match relative path followed by #L (RangeLink owns it)', () => {
      expect(matchesPattern(RANGELINK_COEXISTENCE.RELATIVE_WITH_RANGELINK)).toStrictEqual([]);
    });

    it('should NOT match absolute path followed by #L (RangeLink owns it)', () => {
      expect(matchesPattern(RANGELINK_COEXISTENCE.ABSOLUTE_WITH_RANGELINK)).toStrictEqual([]);
    });

    it('should NOT match tilde path followed by #L (RangeLink owns it)', () => {
      expect(matchesPattern(RANGELINK_COEXISTENCE.TILDE_WITH_RANGELINK)).toStrictEqual([]);
    });

    it('should still match a plain relative path without #L suffix', () => {
      expect(matchesPattern(RANGELINK_COEXISTENCE.CLEAN_RELATIVE)).toStrictEqual(['./src/a.ts']);
    });

    it('should NOT match relative path followed by ##L (rectangular RangeLink owns it)', () => {
      const pattern = buildFilePathPattern(DEFAULT_DELIMITERS);
      const results: string[] = [];
      let match;
      while ((match = pattern.exec(RANGELINK_COEXISTENCE.RECTANGULAR_WITH_RANGELINK)) !== null) {
        results.push(extractFilePath(match));
      }
      expect(results).toStrictEqual([]);
    });

    it('should NOT match path followed by custom delimiter (custom RangeLink owns it)', () => {
      const pattern = buildFilePathPattern({ hash: '@', line: 'l', position: 'C', range: '-' });
      const results: string[] = [];
      let match;
      while (
        (match = pattern.exec(RANGELINK_COEXISTENCE.CUSTOM_DELIMITER_WITH_RANGELINK)) !== null
      ) {
        results.push(extractFilePath(match));
      }
      expect(results).toStrictEqual([]);
    });
  });

  describe('multiple matches', () => {
    it('should match multiple relative paths in one line', () => {
      expect(matchesPattern(MULTI_MATCH_INPUTS.TWO_RELATIVE_PATHS)).toStrictEqual([
        './src/a.ts',
        './src/b.ts',
      ]);
    });

    it('should match absolute and relative path on same line', () => {
      expect(matchesPattern(MULTI_MATCH_INPUTS.ABS_AND_RELATIVE)).toStrictEqual([
        '/abs/file.ts',
        './rel/file.ts',
      ]);
    });

    it('should match quoted and unquoted path on same line', () => {
      expect(matchesPattern(MULTI_MATCH_INPUTS.QUOTED_AND_UNQUOTED)).toStrictEqual([
        '/src/a.ts',
        '/dst/b.ts',
      ]);
    });

    it('should match two double-quoted paths on same line', () => {
      expect(matchesPattern(MULTI_MATCH_INPUTS.TWO_DOUBLE_QUOTED)).toStrictEqual([
        '/src/a.ts',
        '/src/b.ts',
      ]);
    });
  });
});

describe('extractFilePath', () => {
  it('should return double-quoted content without quotes', () => {
    const pattern = buildFilePathPattern(DEFAULT_DELIMITERS);
    const match = pattern.exec('"./path/to/file.ts"')!;
    expect(extractFilePath(match)).toBe('./path/to/file.ts');
  });

  it('should return single-quoted content without quotes', () => {
    const pattern = buildFilePathPattern(DEFAULT_DELIMITERS);
    const match = pattern.exec("'./path/to/file.ts'")!;
    expect(extractFilePath(match)).toBe('./path/to/file.ts');
  });

  it('should return full match for unquoted paths', () => {
    const pattern = buildFilePathPattern(DEFAULT_DELIMITERS);
    const match = pattern.exec('./path/to/file.ts')!;
    expect(extractFilePath(match)).toBe('./path/to/file.ts');
  });
});
