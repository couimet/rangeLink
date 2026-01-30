import { RangeLinkExtensionError } from '../../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../../errors/RangeLinkExtensionErrorCodes';
import { ExtensionResult } from '../../types/ExtensionResult';

import {
  toBeRangeLinkExtensionError,
  toBeRangeLinkExtensionErrorErr,
  toThrowRangeLinkExtensionError,
  toThrowRangeLinkExtensionErrorAsync,
} from './toBeRangeLinkExtensionError';

describe('toBeRangeLinkExtensionError matcher', () => {
  describe('negative validation for details', () => {
    it('fails when error has details but expected does not specify it', () => {
      const error = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.TERMINAL_NOT_DEFINED,
        message: 'Test error',
        functionName: 'testFn',
        details: { key: 'value' },
      });

      const result = toBeRangeLinkExtensionError(error, 'TERMINAL_NOT_DEFINED', {
        message: 'Test error',
        functionName: 'testFn',
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toBe(
        'Expected RangeLinkExtensionError("TERMINAL_NOT_DEFINED") to match:\n  Details: expected undefined, received {"key":"value"}',
      );
    });

    it('passes when both error and expected have undefined details', () => {
      const error = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.TERMINAL_NOT_DEFINED,
        message: 'Test error',
        functionName: 'testFn',
      });

      expect(error).toBeRangeLinkExtensionError('TERMINAL_NOT_DEFINED', {
        message: 'Test error',
        functionName: 'testFn',
      });
    });

    it('passes when expected specifies details and error has matching details', () => {
      const error = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.TERMINAL_NOT_DEFINED,
        message: 'Test error',
        functionName: 'testFn',
        details: { key: 'value' },
      });

      expect(error).toBeRangeLinkExtensionError('TERMINAL_NOT_DEFINED', {
        message: 'Test error',
        functionName: 'testFn',
        details: { key: 'value' },
      });
    });
  });

  describe('negative validation for cause', () => {
    it('fails when error has cause but expected does not specify it', () => {
      const causeError = new Error('Original error');
      const error = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.TERMINAL_NOT_DEFINED,
        message: 'Test error',
        functionName: 'testFn',
        cause: causeError,
      });

      const result = toBeRangeLinkExtensionError(error, 'TERMINAL_NOT_DEFINED', {
        message: 'Test error',
        functionName: 'testFn',
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toBe(
        'Expected RangeLinkExtensionError("TERMINAL_NOT_DEFINED") to match:\n  Cause: expected undefined, received error with message "Original error"',
      );
    });

    it('passes when both error and expected have undefined cause', () => {
      const error = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.TERMINAL_NOT_DEFINED,
        message: 'Test error',
        functionName: 'testFn',
      });

      expect(error).toBeRangeLinkExtensionError('TERMINAL_NOT_DEFINED', {
        message: 'Test error',
        functionName: 'testFn',
      });
    });

    it('passes when expected specifies cause and error has matching cause', () => {
      const causeError = new Error('Original error');
      const error = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.TERMINAL_NOT_DEFINED,
        message: 'Test error',
        functionName: 'testFn',
        cause: causeError,
      });

      expect(error).toBeRangeLinkExtensionError('TERMINAL_NOT_DEFINED', {
        message: 'Test error',
        functionName: 'testFn',
        cause: causeError,
      });
    });
  });
});

describe('toBeRangeLinkExtensionErrorErr matcher', () => {
  describe('negative validation for details', () => {
    it('fails when error has details but expected does not specify it', () => {
      const error = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.TERMINAL_NOT_DEFINED,
        message: 'Test error',
        functionName: 'testFn',
        details: { key: 'value' },
      });
      const resultErr = ExtensionResult.err(error);

      const result = toBeRangeLinkExtensionErrorErr(resultErr, 'TERMINAL_NOT_DEFINED', {
        message: 'Test error',
        functionName: 'testFn',
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toBe(
        'Expected RangeLinkExtensionError("TERMINAL_NOT_DEFINED") to match:\n  Details: expected undefined, received {"key":"value"}',
      );
    });
  });

  describe('negative validation for cause', () => {
    it('fails when error has cause but expected does not specify it', () => {
      const causeError = new Error('Original error');
      const error = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.TERMINAL_NOT_DEFINED,
        message: 'Test error',
        functionName: 'testFn',
        cause: causeError,
      });
      const resultErr = ExtensionResult.err(error);

      const result = toBeRangeLinkExtensionErrorErr(resultErr, 'TERMINAL_NOT_DEFINED', {
        message: 'Test error',
        functionName: 'testFn',
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toBe(
        'Expected RangeLinkExtensionError("TERMINAL_NOT_DEFINED") to match:\n  Cause: expected undefined, received error with message "Original error"',
      );
    });
  });
});

describe('toThrowRangeLinkExtensionError matcher', () => {
  describe('negative validation for details', () => {
    it('fails when thrown error has details but expected does not specify it', () => {
      const throwFn = () => {
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.TERMINAL_NOT_DEFINED,
          message: 'Test error',
          functionName: 'testFn',
          details: { key: 'value' },
        });
      };

      const result = toThrowRangeLinkExtensionError(throwFn, 'TERMINAL_NOT_DEFINED', {
        message: 'Test error',
        functionName: 'testFn',
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toBe(
        'Expected RangeLinkExtensionError("TERMINAL_NOT_DEFINED") to match:\n  Details: expected undefined, received {"key":"value"}',
      );
    });
  });

  describe('negative validation for cause', () => {
    it('fails when thrown error has cause but expected does not specify it', () => {
      const causeError = new Error('Original error');
      const throwFn = () => {
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.TERMINAL_NOT_DEFINED,
          message: 'Test error',
          functionName: 'testFn',
          cause: causeError,
        });
      };

      const result = toThrowRangeLinkExtensionError(throwFn, 'TERMINAL_NOT_DEFINED', {
        message: 'Test error',
        functionName: 'testFn',
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toBe(
        'Expected RangeLinkExtensionError("TERMINAL_NOT_DEFINED") to match:\n  Cause: expected undefined, received error with message "Original error"',
      );
    });
  });
});

describe('toThrowRangeLinkExtensionErrorAsync matcher', () => {
  describe('negative validation for details', () => {
    it('fails when thrown error has details but expected does not specify it', async () => {
      const throwFn = async () => {
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.TERMINAL_NOT_DEFINED,
          message: 'Test error',
          functionName: 'testFn',
          details: { key: 'value' },
        });
      };

      const result = await toThrowRangeLinkExtensionErrorAsync(throwFn, 'TERMINAL_NOT_DEFINED', {
        message: 'Test error',
        functionName: 'testFn',
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toBe(
        'Expected RangeLinkExtensionError("TERMINAL_NOT_DEFINED") to match:\n  Details: expected undefined, received {"key":"value"}',
      );
    });
  });

  describe('negative validation for cause', () => {
    it('fails when thrown error has cause but expected does not specify it', async () => {
      const causeError = new Error('Original error');
      const throwFn = async () => {
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.TERMINAL_NOT_DEFINED,
          message: 'Test error',
          functionName: 'testFn',
          cause: causeError,
        });
      };

      const result = await toThrowRangeLinkExtensionErrorAsync(throwFn, 'TERMINAL_NOT_DEFINED', {
        message: 'Test error',
        functionName: 'testFn',
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toBe(
        'Expected RangeLinkExtensionError("TERMINAL_NOT_DEFINED") to match:\n  Cause: expected undefined, received error with message "Original error"',
      );
    });
  });
});
