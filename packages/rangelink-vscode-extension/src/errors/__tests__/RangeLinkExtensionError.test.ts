import { RangeLinkExtensionError } from '../RangeLinkExtensionError';

describe('RangeLinkExtensionError', () => {
  describe('forUnexpected', () => {
    it('places unexpectedValue in details with default message', () => {
      const err = RangeLinkExtensionError.forUnexpected('test label', 'the-value', 'testFn');

      expect(err).toBeRangeLinkExtensionError('UNEXPECTED_CODE_PATH', {
        message: 'Unexpected test label: "the-value"',
        functionName: 'testFn',
        details: { unexpectedValue: 'the-value' },
      });
    });

    it('uses a default message when no options are provided', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', 42, 'testFn');

      expect(err).toBeRangeLinkExtensionError('UNEXPECTED_CODE_PATH', {
        message: 'Unexpected widget: 42',
        functionName: 'testFn',
        details: { unexpectedValue: 42 },
      });
    });

    it('allows overriding the message via options.message', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', 42, 'testFn', {
        message: 'Custom message',
      });

      expect(err).toBeRangeLinkExtensionError('UNEXPECTED_CODE_PATH', {
        message: 'Custom message',
        functionName: 'testFn',
        details: { unexpectedValue: 42 },
      });
    });

    it('merges extraDetails without clobbering unexpectedValue', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', 'explicit', 'testFn', {
        extraDetails: { extra: 'detail' },
      });

      expect(err).toBeRangeLinkExtensionError('UNEXPECTED_CODE_PATH', {
        message: 'Unexpected widget: "explicit"',
        functionName: 'testFn',
        details: { extra: 'detail', unexpectedValue: 'explicit' },
      });
    });

    it('keeps explicit unexpectedValue over extraDetails.unexpectedValue', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', 'explicit', 'testFn', {
        extraDetails: { unexpectedValue: 'should-not-win' },
      });

      expect(err).toBeRangeLinkExtensionError('UNEXPECTED_CODE_PATH', {
        message: 'Unexpected widget: "explicit"',
        functionName: 'testFn',
        details: { unexpectedValue: 'explicit' },
      });
    });

    it('handles undefined value in details', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', undefined, 'testFn');

      expect(err).toBeRangeLinkExtensionError('UNEXPECTED_CODE_PATH', {
        message: 'Unexpected widget: undefined',
        functionName: 'testFn',
        details: { unexpectedValue: undefined },
      });
    });

    it('handles null value in details', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', null, 'testFn');

      expect(err).toBeRangeLinkExtensionError('UNEXPECTED_CODE_PATH', {
        message: 'Unexpected widget: null',
        functionName: 'testFn',
        details: { unexpectedValue: null },
      });
    });

    it('handles undefined extraDetails', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', 'value', 'testFn', {
        extraDetails: undefined,
      });

      expect(err).toBeRangeLinkExtensionError('UNEXPECTED_CODE_PATH', {
        message: 'Unexpected widget: "value"',
        functionName: 'testFn',
        details: { unexpectedValue: 'value' },
      });
    });

    it('handles empty extraDetails', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', 'value', 'testFn', {
        extraDetails: {},
      });

      expect(err).toBeRangeLinkExtensionError('UNEXPECTED_CODE_PATH', {
        message: 'Unexpected widget: "value"',
        functionName: 'testFn',
        details: { unexpectedValue: 'value' },
      });
    });

    it('handles null value with extraDetails', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', null, 'testFn', {
        extraDetails: { extra: 'present' },
      });

      expect(err).toBeRangeLinkExtensionError('UNEXPECTED_CODE_PATH', {
        message: 'Unexpected widget: null',
        functionName: 'testFn',
        details: { extra: 'present', unexpectedValue: null },
      });
    });

    it('has the correct error name', () => {
      const err = RangeLinkExtensionError.forUnexpected('widget', 'value', 'testFn');

      expect(err.name).toBe('RangeLinkExtensionError');
    });
  });
});
