import { RangeLinkExtensionError } from '../RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes as ErrorCodes } from '../RangeLinkExtensionErrorCodes';

describe('RangeLinkExtensionError', () => {
  describe('forUnexpected', () => {
    it('places unexpectedValue in details', () => {
      const err = RangeLinkExtensionError.forUnexpected('test label', 'the-value', 'testFn');

      expect(err.details).toStrictEqual({ unexpectedValue: 'the-value' });
    });

    it('uses a default message when no options are provided', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', 42, 'testFn');

      expect(err.message).toBe('Unexpected widget: 42');
    });

    it('allows overriding the message via options.message', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', 42, 'testFn', {
        message: 'Custom message',
      });

      expect(err.message).toBe('Custom message');
    });

    it('merges extraDetails without clobbering unexpectedValue', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', 'explicit', 'testFn', {
        extraDetails: { extra: 'detail' },
      });

      expect(err.details).toStrictEqual({ extra: 'detail', unexpectedValue: 'explicit' });
    });

    it('keeps explicit unexpectedValue over extraDetails.unexpectedValue', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', 'explicit', 'testFn', {
        extraDetails: { unexpectedValue: 'should-not-win' },
      });

      expect(err.details).toStrictEqual({ unexpectedValue: 'explicit' });
    });

    it('handles undefined value in details', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', undefined, 'testFn');

      expect(err.details).toStrictEqual({ unexpectedValue: undefined });
    });

    it('handles null value in details', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', null, 'testFn');

      expect(err.details).toStrictEqual({ unexpectedValue: null });
    });

    it('handles undefined extraDetails', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', 'value', 'testFn', {
        extraDetails: undefined,
      });

      expect(err.details).toStrictEqual({ unexpectedValue: 'value' });
    });

    it('handles empty extraDetails', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', 'value', 'testFn', {
        extraDetails: {},
      });

      expect(err.details).toStrictEqual({ unexpectedValue: 'value' });
    });

    it('handles null value with extraDetails', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', null, 'testFn', {
        extraDetails: { extra: 'present' },
      });

      expect(err.details).toStrictEqual({ extra: 'present', unexpectedValue: null });
    });

    it('has the correct error code and name', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', 'value', 'testFn');

      expect(err.code).toBe(ErrorCodes.UNEXPECTED_CODE_PATH);
      expect(err.name).toBe('RangeLinkExtensionError');
    });
  });
});
