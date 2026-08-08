import {
  getUniqueAbsolutePath,
  getUniqueAbsolutePaths,
  getUniqueAbsolutePathsNamed,
  getUniqueFileExtension,
  getUniqueRelativePath,
  getUniqueRelativePaths,
  getUniqueRelativePathsNamed,
} from '../../../../external-deps/couimet/dynamic-testing/uniqueFilePath';

describe('getUniqueFileExtension', () => {
  it('returns a string starting with a dot', () => {
    const ext = getUniqueFileExtension();
    expect(ext.startsWith('.')).toBe(true);
    expect(ext.length).toBeGreaterThan(1);
  });

  it('returns from the curated list', () => {
    const CURATED = ['ts', 'js', 'json', 'tsx', 'jsx', 'css', 'html', 'md', 'txt'];
    // Sample many calls; every result must be in the curated set.
    const results = Array.from({ length: 50 }, () => getUniqueFileExtension().slice(1));
    for (const r of results) {
      expect(CURATED).toContain(r);
    }
  });
});

describe('getUniqueRelativePath', () => {
  describe('filename / basename conflict validation', () => {
    it('throws when filename and basename are both provided', () => {
      expect(() => getUniqueRelativePath({ filename: 'config.ts', basename: 'config' })).toThrow('FILENAME_BASENAME_CONFLICT');
    });

    it('throws when filename and extension are both provided', () => {
      expect(() => getUniqueRelativePath({ filename: 'config.ts', extension: 'ts' })).toThrow('FILENAME_BASENAME_CONFLICT');
    });

    it('throws when filename, basename, and extension are all provided', () => {
      expect(() => getUniqueRelativePath({ filename: 'x.ts', basename: 'y', extension: 'js' })).toThrow('FILENAME_BASENAME_CONFLICT');
    });
  });

  describe('depth: 0 + explicit name + unique: true → error', () => {
    it('throws when depth is 0 with explicit filename and no explicit folders', () => {
      expect(() => getUniqueRelativePath({ depth: 0, filename: 'config.ts' })).toThrow('UNIQUE_PATH_NO_DIRECTORY');
    });

    it('throws when depth is 0 with explicit basename and no explicit folders', () => {
      expect(() => getUniqueRelativePath({ depth: 0, basename: 'config' })).toThrow('UNIQUE_PATH_NO_DIRECTORY');
    });

    it('does NOT throw when depth is 0, filename explicit, but folders: [] is provided', () => {
      // folders: [] is explicit — we inject a unique folder.
      expect(() => getUniqueRelativePath({ depth: 0, folders: [], filename: 'config.ts' })).not.toThrow();
    });

    it('does NOT throw when depth is 0 and filename is auto-generated', () => {
      expect(() => getUniqueRelativePath({ depth: 0 })).not.toThrow();
    });

    it('does NOT throw when depth is 0, filename explicit, but unique: false', () => {
      expect(() => getUniqueRelativePath({ depth: 0, filename: 'config.ts', unique: false })).not.toThrow();
    });
  });

  describe('maxLength validation', () => {
    it('throws when maxLength is too small for minimum filename', () => {
      // Minimum: "-N.ext" where N is counter (at least 5 chars with suffix)
      expect(() => getUniqueRelativePath({ maxLength: 1 })).toThrow('MAXLENGTH_TOO_SMALL');
    });
  });

  describe('uniqueness — suffix placement', () => {
    it('auto folders + auto name: suffix in filename', () => {
      const path = getUniqueRelativePath({ depth: 2 });
      const parts = path.split('/');
      // 2 folders + filename = 3 parts
      expect(parts).toHaveLength(3);
      // Filename (last part) contains unique counter pattern: "-N."
      expect(parts[2]).toMatch(/-\d+\./);
    });

    it('auto folders + explicit filename: suffix in last folder', () => {
      const path = getUniqueRelativePath({ depth: 2, filename: 'config.ts' });
      const parts = path.split('/');
      // 2 folders + filename = 3 parts; last folder has suffix, filename is clean
      expect(parts).toHaveLength(3);
      expect(parts[1]).toMatch(/-\d+$/);
      expect(parts[2]).toBe('config.ts');
    });

    it('explicit folders + auto name: suffix in filename', () => {
      const path = getUniqueRelativePath({ folders: ['lib', 'core'] });
      const parts = path.split('/');
      expect(parts[0]).toBe('lib');
      expect(parts[1]).toBe('core');
      expect(parts[2]).toMatch(/-\d+\./);
    });

    it('explicit folders + explicit filename: injected unique folder', () => {
      const path = getUniqueRelativePath({ folders: ['lib', 'core'], filename: 'types.ts' });
      const parts = path.split('/');
      // lib / core / injected-unique-folder / types.ts
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe('lib');
      expect(parts[1]).toBe('core');
      expect(parts[2]).toMatch(/-\d+$/);
      expect(parts[3]).toBe('types.ts');
    });

    it('unique: false — no suffix anywhere', () => {
      const path = getUniqueRelativePath({
        folders: ['lib'],
        filename: 'config.ts',
        unique: false,
      });
      expect(path).toBe('lib/config.ts');
    });

    it('unique: false with auto name — no suffix anywhere', () => {
      const path = getUniqueRelativePath({ depth: 1, unique: false });
      const parts = path.split('/');
      expect(parts).toHaveLength(2);
      // No counter in filename
      expect(parts[1]).not.toMatch(/-\d+/);
    });
  });

  describe('basename — extension behavior', () => {
    it('uses random extension when basename is provided without extension', () => {
      const path = getUniqueRelativePath({ basename: 'config' });
      const filename = path.split('/').pop()!;
      expect(filename.startsWith('config.')).toBe(true);
    });

    it('uses provided extension when both basename and extension are given', () => {
      const path = getUniqueRelativePath({ depth: 0, unique: false, basename: 'config', extension: 'json' });
      expect(path).toBe('config.json');
    });

    it('normalizes extension without leading dot', () => {
      const path = getUniqueRelativePath({ depth: 0, unique: false, basename: 'config', extension: 'ts' });
      expect(path).toBe('config.ts');
    });
  });

  describe('path structure options', () => {
    it('depth controls number of directory levels', () => {
      const path = getUniqueRelativePath({ depth: 1 });
      const parts = path.split('/');
      expect(parts).toHaveLength(2); // 1 folder + filename
    });

    it('depth: 0 produces bare filename', () => {
      const path = getUniqueRelativePath({ depth: 0 });
      expect(path).not.toContain('/');
      expect(path).toMatch(/\.\w+$/);
    });

    it('folders: [] produces bare filename (with unique: false)', () => {
      const path = getUniqueRelativePath({ folders: [], filename: 'f.ts', unique: false });
      expect(path).toBe('f.ts');
    });

    it('folders: [] with unique: true and explicit name injects a folder', () => {
      const path = getUniqueRelativePath({ folders: [], filename: 'f.ts' });
      const parts = path.split('/');
      expect(parts).toHaveLength(2);
      expect(parts[0]).toMatch(/-\d+$/);
      expect(parts[1]).toBe('f.ts');
    });

    it('upLevels prepends ../ segments', () => {
      const path = getUniqueRelativePath({ depth: 1, upLevels: 2 });
      expect(path.startsWith('../../')).toBe(true);
    });

    it('upLevels: 0 adds no prefix', () => {
      const path = getUniqueRelativePath({ depth: 1, upLevels: 0 });
      expect(path.startsWith('..')).toBe(false);
    });

    it('custom separator is used throughout', () => {
      const path = getUniqueRelativePath({
        depth: 2,
        folders: ['a', 'b'],
        filename: 'c.ts',
        unique: false,
        separator: '\\',
      });
      expect(path).toBe('a\\b\\c.ts');
    });

    it('custom separator with upLevels', () => {
      const path = getUniqueRelativePath({
        depth: 1,
        upLevels: 1,
        folders: ['src'],
        filename: 'f.ts',
        unique: false,
        separator: '\\',
      });
      expect(path).toBe('..\\src\\f.ts');
    });
  });

  describe('extension normalization', () => {
    it('accepts extension with leading dot', () => {
      const path = getUniqueRelativePath({
        depth: 0,
        unique: false,
        basename: 'file',
        extension: '.ts',
      });
      expect(path).toBe('file.ts');
    });

    it('accepts extension without leading dot', () => {
      const path = getUniqueRelativePath({
        depth: 0,
        unique: false,
        basename: 'file',
        extension: 'js',
      });
      expect(path).toBe('file.js');
    });
  });

  describe('auto-generated name with explicit extension', () => {
    it('uses provided extension when name is auto-generated', () => {
      const path = getUniqueRelativePath({ depth: 0, extension: 'json' });
      expect(path.endsWith('.json')).toBe(true);
    });

    it('uses maxLength with unique: false to cap name length', () => {
      const path = getUniqueRelativePath({ depth: 0, unique: false, maxLength: 10, extension: 'ts' });
      // 10 chars total: name.ts = 7 char name + '.ts'
      const name = path.split('/').pop()!;
      expect(name.endsWith('.ts')).toBe(true);
      expect(name.length).toBeLessThanOrEqual(10);
    });
  });

  describe('all-auto path has expected shape', () => {
    it('produces a path with folders, separator, and dotted extension', () => {
      const path = getUniqueRelativePath();
      expect(path).toContain('/');
      expect(path).toMatch(/\.\w{2,4}$/);
    });
  });
});

describe('getUniqueAbsolutePath', () => {
  it('prepends default root by default', () => {
    const path = getUniqueAbsolutePath({ depth: 0 });
    expect(path.startsWith('/home/user/project/')).toBe(true);
  });

  it('uses custom root when provided', () => {
    const path = getUniqueAbsolutePath({ depth: 0, root: '/tmp' });
    expect(path.startsWith('/tmp/')).toBe(true);
  });

  it('normalizes trailing separator on root', () => {
    const path = getUniqueAbsolutePath({ depth: 0, root: '/tmp/' });
    expect(path.startsWith('/tmp/')).toBe(true);
    expect(path).not.toContain('//');
  });

  it('respects custom separator', () => {
    const path = getUniqueAbsolutePath({
      depth: 0,
      root: 'C:\\Users',
      separator: '\\',
    });
    expect(path).toContain('C:\\Users\\');
  });

  it('root: empty string behaves like relative path', () => {
    const path = getUniqueAbsolutePath({ depth: 0, root: '' });
    // When root is '', root.endsWith('/') is false, so normalized is ''.
    // Then '' + '/' + relative = '/relative'. With depth:0 this is '/bareFilename'.
    // Actually empty root with separator: normalizedRoot = '' (not ending with /), then '' + '/' + name
    expect(path.startsWith('/')).toBe(true);
    expect(path).not.toContain('//');
  });

  it('works with no arguments (all defaults)', () => {
    const path = getUniqueAbsolutePath();
    expect(path.startsWith('/home/user/project/')).toBe(true);
    expect(path).toMatch(/\.\w{2,4}$/);
  });

  it('delegates options to relative path (unique: false)', () => {
    const path = getUniqueAbsolutePath({
      folders: ['lib'],
      filename: 'config.ts',
      unique: false,
      root: '/app',
    });
    expect(path).toBe('/app/lib/config.ts');
  });
});

describe('getUniqueRelativePaths', () => {
  it('throws when count is 0', () => {
    expect(() => getUniqueRelativePaths(0)).toThrow('COUNT_NOT_POSITIVE_INTEGER');
  });

  it('throws when count is negative', () => {
    expect(() => getUniqueRelativePaths(-1)).toThrow('COUNT_NOT_POSITIVE_INTEGER');
  });

  it('returns array of requested length', () => {
    const paths = getUniqueRelativePaths(3);
    expect(paths).toHaveLength(3);
  });

  it('each path is unique', () => {
    const paths = getUniqueRelativePaths(5);
    expect(new Set(paths).size).toBe(5);
  });

  it('passes options through', () => {
    const paths = getUniqueRelativePaths(2, { depth: 0, unique: false, filename: 'f.ts' });
    expect(paths).toStrictEqual(['f.ts', 'f.ts']);
  });
});

describe('getUniqueRelativePathsNamed', () => {
  it('throws when keys is empty', () => {
    expect(() => getUniqueRelativePathsNamed([])).toThrow('KEYS_ARRAY_EMPTY');
  });

  it('returns object with requested keys', () => {
    const result = getUniqueRelativePathsNamed(['alpha', 'beta'] as const);
    expect(Object.keys(result)).toStrictEqual(['alpha', 'beta']);
  });

  it('each value is a string path', () => {
    const result = getUniqueRelativePathsNamed(['x'] as const);
    expect(typeof result.x).toBe('string');
    expect(result.x).toContain('/');
  });

  it('passes options through', () => {
    const result = getUniqueRelativePathsNamed(['a'], {
      depth: 0,
      unique: false,
      filename: 'f.ts',
    });
    expect(result.a).toBe('f.ts');
  });
});

describe('getUniqueAbsolutePaths', () => {
  it('throws when count is 0', () => {
    expect(() => getUniqueAbsolutePaths(0)).toThrow('COUNT_NOT_POSITIVE_INTEGER');
  });

  it('returns array of requested length', () => {
    const paths = getUniqueAbsolutePaths(3, { depth: 0 });
    expect(paths).toHaveLength(3);
    for (const p of paths) {
      expect(p.startsWith('/home/user/project/')).toBe(true);
    }
  });
});

describe('getUniqueAbsolutePathsNamed', () => {
  it('throws when keys is empty', () => {
    expect(() => getUniqueAbsolutePathsNamed([])).toThrow('KEYS_ARRAY_EMPTY');
  });

  it('returns absolute paths for each key', () => {
    const result = getUniqueAbsolutePathsNamed(['main', 'test'] as const, { depth: 0 });
    expect(Object.keys(result)).toStrictEqual(['main', 'test']);
    expect(result.main.startsWith('/home/user/project/')).toBe(true);
    expect(result.test.startsWith('/home/user/project/')).toBe(true);
  });
});
