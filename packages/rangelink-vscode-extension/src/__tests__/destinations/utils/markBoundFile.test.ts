import { markBoundFile } from '../../../destinations/utils';
import type { EligibleFile } from '../../../types';
import { createMockUri } from '../../helpers';

describe('markBoundFile', () => {
  let fileA: EligibleFile;
  let fileB: EligibleFile;
  let fileC: EligibleFile;

  beforeEach(() => {
    const uriA = createMockUri('/workspace/src/app.ts');
    const uriB = createMockUri('/workspace/src/utils.ts');
    const uriC = createMockUri('/workspace/src/index.ts');
    fileA = {
      bindOptions: { kind: 'text-editor', uri: uriA, viewColumn: 1 },
      filename: 'app.ts',
      displayPath: 'src/app.ts',
      viewColumn: 1,
      isCurrentInGroup: true,
      isActiveEditor: true,
    };
    fileB = {
      bindOptions: { kind: 'text-editor', uri: uriB, viewColumn: 1 },
      filename: 'utils.ts',
      displayPath: 'src/utils.ts',
      viewColumn: 1,
      isCurrentInGroup: false,
      isActiveEditor: false,
    };
    fileC = {
      bindOptions: { kind: 'text-editor', uri: uriC, viewColumn: 2 },
      filename: 'index.ts',
      displayPath: 'src/index.ts',
      viewColumn: 2,
      isCurrentInGroup: true,
      isActiveEditor: false,
    };
  });

  it('marks matching file as bound and others as not-bound', () => {
    const result = markBoundFile([fileA, fileB, fileC], fileB.bindOptions.uri.toString());

    expect(result).toStrictEqual([
      { ...fileA, boundState: 'not-bound' },
      { ...fileB, boundState: 'bound' },
      { ...fileC, boundState: 'not-bound' },
    ]);
  });

  it('marks all as not-bound when boundFileUriString is undefined', () => {
    const result = markBoundFile([fileA, fileB], undefined);

    expect(result).toStrictEqual([
      { ...fileA, boundState: 'not-bound' },
      { ...fileB, boundState: 'not-bound' },
    ]);
  });

  it('marks all as not-bound when no URI matches', () => {
    const result = markBoundFile([fileA, fileB], 'file:///workspace/src/nonexistent.ts');

    expect(result).toStrictEqual([
      { ...fileA, boundState: 'not-bound' },
      { ...fileB, boundState: 'not-bound' },
    ]);
  });

  it('preserves all original EligibleFile properties', () => {
    const result = markBoundFile([fileA], fileA.bindOptions.uri.toString());

    expect(result[0]).toStrictEqual({
      bindOptions: fileA.bindOptions,
      filename: 'app.ts',
      displayPath: 'src/app.ts',
      viewColumn: 1,
      isCurrentInGroup: true,
      isActiveEditor: true,
      boundState: 'bound',
    });
  });

  it('does not mutate the input array', () => {
    markBoundFile([fileA], fileA.bindOptions.uri.toString());

    expect(fileA.boundState).toBeUndefined();
  });

  it('returns empty array for empty input', () => {
    expect(markBoundFile([], 'file:///workspace/src/app.ts')).toStrictEqual([]);
  });

  it('marks file as bound when URI and viewColumn both match', () => {
    const fileAInColumn2: EligibleFile = {
      ...fileA,
      viewColumn: 2,
      bindOptions: { ...fileA.bindOptions, viewColumn: 2 },
    };

    const result = markBoundFile([fileA, fileAInColumn2], fileA.bindOptions.uri.toString(), 1);

    expect(result).toStrictEqual([
      { ...fileA, boundState: 'bound' },
      { ...fileAInColumn2, boundState: 'not-bound' },
    ]);
  });

  it('does not mark file as bound when URI matches but viewColumn differs', () => {
    const fileAInColumn2: EligibleFile = {
      ...fileA,
      viewColumn: 2,
      bindOptions: { ...fileA.bindOptions, viewColumn: 2 },
    };

    const result = markBoundFile([fileA, fileAInColumn2], fileA.bindOptions.uri.toString(), 2);

    expect(result).toStrictEqual([
      { ...fileA, boundState: 'not-bound' },
      { ...fileAInColumn2, boundState: 'bound' },
    ]);
  });
});
