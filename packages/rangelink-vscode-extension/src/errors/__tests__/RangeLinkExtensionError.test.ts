import { RangeLinkExtensionError } from '../RangeLinkExtensionError';

describe('RangeLinkExtensionError', () => {
  it('sets name to RangeLinkExtensionError', () => {
    const err = RangeLinkExtensionError.forUnexpectedSwitchDefault('widget', 'value', 'testFn');

    expect(err.name).toBe('RangeLinkExtensionError');
  });
});
