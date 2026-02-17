import { disambiguateFilenames } from '../../../destinations/utils';

describe('disambiguateFilenames', () => {
  it('returns empty array for empty input', () => {
    expect(disambiguateFilenames([])).toStrictEqual([]);
  });

  it('returns empty disambiguator for single file', () => {
    const result = disambiguateFilenames([{ filename: 'app.ts', relativePath: 'src/app.ts' }]);

    expect(result).toStrictEqual(['']);
  });

  it('returns empty disambiguators when all filenames are unique', () => {
    const result = disambiguateFilenames([
      { filename: 'app.ts', relativePath: 'src/app.ts' },
      { filename: 'utils.ts', relativePath: 'src/utils.ts' },
      { filename: 'README.md', relativePath: 'README.md' },
    ]);

    expect(result).toStrictEqual(['', '', '']);
  });

  it('disambiguates two README.md files with different parents', () => {
    const result = disambiguateFilenames([
      { filename: 'README.md', relativePath: 'packages/rangelink-vscode-extension/README.md' },
      { filename: 'README.md', relativePath: 'docs/tutorials/01-basic-usage/README.md' },
    ]);

    expect(result).toStrictEqual(['…/rangelink-vscode-extension', '…/01-basic-usage']);
  });

  it('uses ./ for workspace root file colliding with nested files', () => {
    const result = disambiguateFilenames([
      { filename: 'README.md', relativePath: 'README.md' },
      { filename: 'README.md', relativePath: 'packages/rangelink-vscode-extension/README.md' },
      { filename: 'README.md', relativePath: 'docs/tutorials/01-basic-usage/README.md' },
    ]);

    expect(result).toStrictEqual(['./', '…/rangelink-vscode-extension', '…/01-basic-usage']);
  });

  it('adds more parent segments when one is not enough', () => {
    const result = disambiguateFilenames([
      { filename: 'index.ts', relativePath: 'src/features/auth/index.ts' },
      { filename: 'index.ts', relativePath: 'src/features/billing/index.ts' },
      { filename: 'index.ts', relativePath: 'src/utils/billing/index.ts' },
    ]);

    expect(result).toStrictEqual(['…/features/auth', '…/features/billing', '…/utils/billing']);
  });

  it('drops ellipsis when all parent segments are shown', () => {
    const result = disambiguateFilenames([
      { filename: 'index.ts', relativePath: 'src/index.ts' },
      { filename: 'index.ts', relativePath: 'lib/index.ts' },
    ]);

    expect(result).toStrictEqual(['src', 'lib']);
  });

  it('keeps identical relativePaths as-is since they cannot be further disambiguated', () => {
    const result = disambiguateFilenames([
      { filename: 'index.ts', relativePath: 'src/index.ts' },
      { filename: 'index.ts', relativePath: 'src/index.ts' },
    ]);

    expect(result).toStrictEqual(['src', 'src']);
  });

  it('uses ./ for all-root collision group', () => {
    const result = disambiguateFilenames([
      { filename: 'README.md', relativePath: 'README.md' },
      { filename: 'README.md', relativePath: 'README.md' },
    ]);

    expect(result).toStrictEqual(['./', './']);
  });

  it('only disambiguates colliding filenames, leaving unique ones empty', () => {
    const result = disambiguateFilenames([
      { filename: 'README.md', relativePath: 'packages/rangelink-vscode-extension/README.md' },
      { filename: 'app.ts', relativePath: 'src/app.ts' },
      { filename: 'README.md', relativePath: 'docs/tutorials/01-basic-usage/README.md' },
    ]);

    expect(result).toStrictEqual(['…/rangelink-vscode-extension', '', '…/01-basic-usage']);
  });
});
