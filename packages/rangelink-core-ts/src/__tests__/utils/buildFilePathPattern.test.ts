import { buildFilePathPattern, extractFilePath } from '../../utils/buildLinkPattern';

const matchesPattern = (text: string): string[] => {
  const pattern = buildFilePathPattern();
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    results.push(extractFilePath(match));
  }
  return results;
};

describe('buildFilePathPattern', () => {
  it('should have global flag enabled', () => {
    expect(buildFilePathPattern().global).toBe(true);
  });

  describe('quoted paths', () => {
    it('should match double-quoted path', () => {
      expect(matchesPattern('Check "/path/to/file.ts" for details')).toStrictEqual([
        '/path/to/file.ts',
      ]);
    });

    it('should match single-quoted path', () => {
      expect(matchesPattern("Check '/path/to/file.ts' for details")).toStrictEqual([
        '/path/to/file.ts',
      ]);
    });

    it('should match double-quoted path with spaces', () => {
      expect(matchesPattern('Open "/path/with spaces/file.ts" now')).toStrictEqual([
        '/path/with spaces/file.ts',
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
      expect(matchesPattern('/path/to/my-file.test.ts')).toStrictEqual([
        '/path/to/my-file.test.ts',
      ]);
    });

    it('should NOT match absolute path inside a URL', () => {
      expect(matchesPattern('See https://example.com/path/file.ts for info')).toStrictEqual([]);
    });

    it('should NOT match path preceded by word characters', () => {
      expect(matchesPattern('domain.com/path/file.ts')).toStrictEqual([]);
    });
  });

  describe('relative paths', () => {
    it('should match ./ relative path', () => {
      expect(matchesPattern('Check ./src/file.ts please')).toStrictEqual(['./src/file.ts']);
    });

    it('should match ../ relative path', () => {
      expect(matchesPattern('Check ../lib/util.ts please')).toStrictEqual(['../lib/util.ts']);
    });
  });

  describe('tilde paths', () => {
    it('should match ~/path', () => {
      expect(matchesPattern('Open ~/projects/app/main.ts now')).toStrictEqual([
        '~/projects/app/main.ts',
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
  });

  describe('multiple matches', () => {
    it('should match multiple paths in one line', () => {
      expect(matchesPattern('From ./src/a.ts to ./src/b.ts')).toStrictEqual([
        './src/a.ts',
        './src/b.ts',
      ]);
    });
  });
});

describe('extractFilePath', () => {
  it('should return double-quoted content without quotes', () => {
    const pattern = buildFilePathPattern();
    const match = pattern.exec('"./path/to/file.ts"')!;
    expect(extractFilePath(match)).toBe('./path/to/file.ts');
  });

  it('should return single-quoted content without quotes', () => {
    const pattern = buildFilePathPattern();
    const match = pattern.exec("'./path/to/file.ts'")!;
    expect(extractFilePath(match)).toBe('./path/to/file.ts');
  });

  it('should return full match for unquoted paths', () => {
    const pattern = buildFilePathPattern();
    const match = pattern.exec('./path/to/file.ts')!;
    expect(extractFilePath(match)).toBe('./path/to/file.ts');
  });
});
