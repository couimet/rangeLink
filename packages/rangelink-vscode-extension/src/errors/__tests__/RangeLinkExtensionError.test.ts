import { RangeLinkExtensionError } from '../RangeLinkExtensionError';

describe('RangeLinkExtensionError', () => {
  it('sets name to RangeLinkExtensionError on forUnexpectedSwitchDefault errors', () => {
    const err = RangeLinkExtensionError.forUnexpectedSwitchDefault('widget', 'value', 'testFn');

    expect(err).toHaveDetailedError('UNEXPECTED_SWITCH_VALUE', {
      message: 'Unexpected widget: "value"',
      functionName: 'testFn',
      details: { unexpectedValue: 'value' },
    });
    expect(err.name).toBe('RangeLinkExtensionError');
  });
});
