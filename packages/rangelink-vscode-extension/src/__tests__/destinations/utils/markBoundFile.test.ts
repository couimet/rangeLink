import type { EligibleFile } from '../../../types';
import { markBoundFile } from '../../../destinations/utils';
import { createMockUri } from '../../helpers';

describe('markBoundFile', () => {
  let fileA: EligibleFile;
  let fileB: EligibleFile;
  let fileC: EligibleFile;

  beforeEach(() => {
    fileA = {
      uri: createMockUri('/workspace/src/app.ts'),
      filename: 'app.ts',
      tabGroupIndex: 1,
      isCurrentInGroup: true,
      isActiveEditor: true,
    };
    fileB = {
      uri: createMockUri('/workspace/src/utils.ts'),
      filename: 'utils.ts',
      tabGroupIndex: 1,
      isCurrentInGroup: false,
      isActiveEditor: false,
    };
    fileC = {
      uri: createMockUri('/workspace/src/index.ts'),
      filename: 'index.ts',
      tabGroupIndex: 2,
      isCurrentInGroup: true,
      isActiveEditor: false,
    };
  });

  it('marks matching file as bound and others as not-bound', () => {
    const result = markBoundFile([fileA, fileB, fileC], fileB.uri.toString());

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
    const result = markBoundFile([fileA], fileA.uri.toString());

    expect(result[0]).toStrictEqual({
      uri: fileA.uri,
      filename: 'app.ts',
      tabGroupIndex: 1,
      isCurrentInGroup: true,
      isActiveEditor: true,
      boundState: 'bound',
    });
  });

  it('does not mutate the input array', () => {
    markBoundFile([fileA], fileA.uri.toString());

    expect(fileA.boundState).toBeUndefined();
  });

  it('returns empty array for empty input', () => {
    expect(markBoundFile([], 'file:///workspace/src/app.ts')).toStrictEqual([]);
  });
});
