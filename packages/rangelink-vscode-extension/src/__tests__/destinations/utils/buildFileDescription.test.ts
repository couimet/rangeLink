import { buildFileDescription } from '../../../destinations/utils/buildFileDescription';
import { createMockEligibleFile } from '../../helpers';

describe('buildFileDescription', () => {
  it('returns undefined when no disambiguator and no badges', () => {
    const file = createMockEligibleFile({ tabGroupIndex: 1 });

    expect(buildFileDescription(file, '')).toBeUndefined();
  });

  it('returns disambiguator only when no badges', () => {
    const file = createMockEligibleFile({ tabGroupIndex: 2 });

    expect(buildFileDescription(file, '…/components')).toBe('…/components');
  });

  it('returns bound badge only', () => {
    const file = createMockEligibleFile({ tabGroupIndex: 1, boundState: 'bound' });

    expect(buildFileDescription(file, '')).toBe('bound');
  });

  it('returns active badge only', () => {
    const file = createMockEligibleFile({ tabGroupIndex: 1, isActiveEditor: true });

    expect(buildFileDescription(file, '')).toBe('active');
  });

  it('combines both bound and active badges', () => {
    const file = createMockEligibleFile({
      tabGroupIndex: 1,
      boundState: 'bound',
      isActiveEditor: true,
    });

    expect(buildFileDescription(file, '')).toBe('bound · active');
  });

  it('combines disambiguator with both badges', () => {
    const file = createMockEligibleFile({
      tabGroupIndex: 3,
      boundState: 'bound',
      isActiveEditor: true,
    });

    expect(buildFileDescription(file, './')).toBe('./ · bound · active');
  });

  it('returns undefined when boundState is not-bound and not active and no disambiguator', () => {
    const file = createMockEligibleFile({
      tabGroupIndex: 2,
      boundState: 'not-bound',
      isActiveEditor: false,
    });

    expect(buildFileDescription(file, '')).toBeUndefined();
  });

  it('returns disambiguator with bound badge', () => {
    const file = createMockEligibleFile({ tabGroupIndex: 1, boundState: 'bound' });

    expect(buildFileDescription(file, '…/utils')).toBe('…/utils · bound');
  });

  it('returns disambiguator with active badge', () => {
    const file = createMockEligibleFile({ tabGroupIndex: 1, isActiveEditor: true });

    expect(buildFileDescription(file, '…/src')).toBe('…/src · active');
  });
});
