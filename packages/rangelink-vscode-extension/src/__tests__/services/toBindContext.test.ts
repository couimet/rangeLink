import { toBindContext } from '../../services/toBindContext';
import type { ResolveResult } from '../../services/types';

describe('toBindContext', () => {
  it('returns BindContext when canProceed and bindPerformed are both true', () => {
    const result: ResolveResult = {
      canProceed: true,
      bindPerformed: true,
      destinationName: 'Terminal ("bash")',
    };

    expect(toBindContext(result)).toStrictEqual({ destinationName: 'Terminal ("bash")' });
  });

  it('returns undefined when canProceed is true but bindPerformed is false', () => {
    const result: ResolveResult = {
      canProceed: true,
      bindPerformed: false,
    };

    expect(toBindContext(result)).toBeUndefined();
  });

  it('returns undefined when canProceed is false', () => {
    const result: ResolveResult = {
      canProceed: false,
    };

    expect(toBindContext(result)).toBeUndefined();
  });
});
