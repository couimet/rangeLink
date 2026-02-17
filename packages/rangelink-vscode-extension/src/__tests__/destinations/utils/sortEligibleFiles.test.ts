import { sortEligibleFiles } from '../../../destinations/utils/sortEligibleFiles';
import type { EligibleFile } from '../../../types';
import { createMockEligibleFile } from '../../helpers';

describe('sortEligibleFiles', () => {
  it('places bound file before current-in-group file', () => {
    const current = createMockEligibleFile({
      filename: 'current.ts',
      isCurrentInGroup: true,
      boundState: 'not-bound',
    });
    const bound = createMockEligibleFile({ filename: 'bound.ts', boundState: 'bound' });

    const result = sortEligibleFiles([current, bound]);

    expect(result).toStrictEqual([bound, current]);
  });

  it('places current-in-group file before alphabetically earlier file', () => {
    const aaa = createMockEligibleFile({ filename: 'aaa.ts', boundState: 'not-bound' });
    const zzz = createMockEligibleFile({
      filename: 'zzz.ts',
      isCurrentInGroup: true,
      boundState: 'not-bound',
    });

    const result = sortEligibleFiles([aaa, zzz]);

    expect(result).toStrictEqual([zzz, aaa]);
  });

  it('uses alphabetical tiebreaker when bound and current-in-group are equal', () => {
    const charlie = createMockEligibleFile({ filename: 'charlie.ts', boundState: 'not-bound' });
    const alpha = createMockEligibleFile({ filename: 'alpha.ts', boundState: 'not-bound' });
    const bravo = createMockEligibleFile({ filename: 'bravo.ts', boundState: 'not-bound' });

    const result = sortEligibleFiles([charlie, alpha, bravo]);

    expect(result).toStrictEqual([alpha, bravo, charlie]);
  });

  it('keeps already sorted input in same order', () => {
    const bound = createMockEligibleFile({
      filename: 'bound.ts',
      boundState: 'bound',
      isCurrentInGroup: true,
    });
    const current = createMockEligibleFile({
      filename: 'current.ts',
      isCurrentInGroup: true,
      boundState: 'not-bound',
    });
    const alpha = createMockEligibleFile({ filename: 'alpha.ts', boundState: 'not-bound' });
    const beta = createMockEligibleFile({ filename: 'beta.ts', boundState: 'not-bound' });

    const result = sortEligibleFiles([bound, current, alpha, beta]);

    expect(result).toStrictEqual([bound, current, alpha, beta]);
  });

  it('returns single item unchanged', () => {
    const only = createMockEligibleFile({ filename: 'only.ts' });

    const result = sortEligibleFiles([only]);

    expect(result).toStrictEqual([only]);
  });

  it('returns empty array for empty input', () => {
    expect(sortEligibleFiles([])).toStrictEqual([]);
  });

  it('does not mutate the input array', () => {
    const beta = createMockEligibleFile({ filename: 'beta.ts', boundState: 'not-bound' });
    const alpha = createMockEligibleFile({ filename: 'alpha.ts', boundState: 'bound' });
    const files: readonly EligibleFile[] = [beta, alpha];

    sortEligibleFiles(files);

    expect(files).toStrictEqual([beta, alpha]);
  });

  it('treats absent boundState same as not-bound', () => {
    const unset = createMockEligibleFile({ filename: 'unset.ts' });
    const bound = createMockEligibleFile({ filename: 'bound.ts', boundState: 'bound' });

    const result = sortEligibleFiles([unset, bound]);

    expect(result).toStrictEqual([bound, unset]);
  });
});
