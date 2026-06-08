import { validateTerminalDefined } from '../../utils/validateTerminalDefined';

const createMockTerminal = (name: string) => ({ name }) as any;

describe('validateTerminalDefined', () => {
  it('returns ok with the terminal when defined', () => {
    const terminal = createMockTerminal('my-terminal');

    const result = validateTerminalDefined(terminal);

    expect(result).toBeOkWith((value: unknown) => {
      expect(value).toBe(terminal);
    });
  });

  it('returns err when terminal is undefined', () => {
    const result = validateTerminalDefined(undefined);

    expect(result).toBeRangeLinkExtensionErrorErr('TERMINAL_NOT_DEFINED', {
      message: 'Terminal reference is not defined',
      functionName: 'validateTerminalDefined',
    });
  });
});
