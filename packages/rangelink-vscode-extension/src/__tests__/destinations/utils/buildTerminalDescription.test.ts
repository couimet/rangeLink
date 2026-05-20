import { buildTerminalDescription } from '../../../destinations/utils/buildTerminalDescription';
import { createMockEligibleTerminal } from '../../helpers';

describe('buildTerminalDescription', () => {
  it('returns "bound · active" when bound AND active', () => {
    const result = buildTerminalDescription(
      createMockEligibleTerminal({ boundState: 'bound', isActive: true }),
    );
    expect(result).toBe('bound \u00b7 active');
  });

  it('returns "bound" when bound only', () => {
    const result = buildTerminalDescription(
      createMockEligibleTerminal({ boundState: 'bound', isActive: false }),
    );
    expect(result).toBe('bound');
  });

  it('returns "active" when active only', () => {
    const result = buildTerminalDescription(createMockEligibleTerminal({ isActive: true }));
    expect(result).toBe('active');
  });

  it('returns undefined when neither bound nor active', () => {
    const result = buildTerminalDescription(createMockEligibleTerminal());
    expect(result).toBeUndefined();
  });

  it('returns "active" when boundState is "not-bound" and active', () => {
    const result = buildTerminalDescription(
      createMockEligibleTerminal({ boundState: 'not-bound', isActive: true }),
    );
    expect(result).toBe('active');
  });

  it('returns undefined when boundState is "not-bound" and not active', () => {
    const result = buildTerminalDescription(
      createMockEligibleTerminal({ boundState: 'not-bound', isActive: false }),
    );
    expect(result).toBeUndefined();
  });

  it('returns "not bindable" when nonBindableReason is set and terminal is not active', () => {
    const result = buildTerminalDescription(
      createMockEligibleTerminal({
        boundState: 'not-bound',
        isActive: false,
        nonBindableReason: 'extension-managed',
      }),
    );
    expect(result).toBe('not bindable');
  });

  it('returns "active · not bindable" when active AND nonBindableReason is set', () => {
    const result = buildTerminalDescription(
      createMockEligibleTerminal({
        boundState: 'not-bound',
        isActive: true,
        nonBindableReason: 'extension-managed',
      }),
    );
    expect(result).toBe('active · not bindable');
  });
});
