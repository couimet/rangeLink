import { RangeLinkError, RangeLinkErrorCodes, Result } from 'rangelink-core-ts';

import {
  toBeRangeLinkError,
  toBeRangeLinkErrorErr,
  toThrowRangeLinkError,
} from './toBeRangeLinkError';

describe('toBeRangeLinkError matcher', () => {
  describe('negative validation for details', () => {
    it('fails when error has details but expected does not specify it', () => {
      const error = new RangeLinkError({
        code: RangeLinkErrorCodes.VALIDATION,
        message: 'Test error',
        functionName: 'testFn',
        details: { key: 'value' },
      });

      const result = toBeRangeLinkError(error, 'VALIDATION', {
        message: 'Test error',
        functionName: 'testFn',
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toBe(
        'Expected RangeLinkError to match all properties:\n  Details: expected undefined, received {"key":"value"}',
      );
    });

    it('fails with diff when expected specifies details that do not match', () => {
      const error = new RangeLinkError({
        code: RangeLinkErrorCodes.VALIDATION,
        message: 'Test error',
        functionName: 'testFn',
        details: { key: 'actual' },
      });

      const result = toBeRangeLinkError(error, 'VALIDATION', {
        message: 'Test error',
        functionName: 'testFn',
        details: { key: 'expected' },
      });

      expect(result.pass).toBe(false);
      const msg = result.message();
      expect(msg).toContain('Details (toStrictEqual):');
      expect(msg).toContain('"key": "expected"');
      expect(msg).toContain('"key": "actual"');
      expect(msg).toContain('diff:');
    });

    it('passes when both error and expected have undefined details', () => {
      const error = new RangeLinkError({
        code: RangeLinkErrorCodes.VALIDATION,
        message: 'Test error',
        functionName: 'testFn',
      });

      expect(error).toBeRangeLinkError('VALIDATION', {
        message: 'Test error',
        functionName: 'testFn',
      });
    });

    it('passes when expected specifies details and error has matching details', () => {
      const error = new RangeLinkError({
        code: RangeLinkErrorCodes.VALIDATION,
        message: 'Test error',
        functionName: 'testFn',
        details: { key: 'value' },
      });

      expect(error).toBeRangeLinkError('VALIDATION', {
        message: 'Test error',
        functionName: 'testFn',
        details: { key: 'value' },
      });
    });
  });

  describe('negative validation for cause', () => {
    it('fails when error has cause but expected does not specify it', () => {
      const causeError = new Error('Original error');
      const error = new RangeLinkError({
        code: RangeLinkErrorCodes.VALIDATION,
        message: 'Test error',
        functionName: 'testFn',
        cause: causeError,
      });

      const result = toBeRangeLinkError(error, 'VALIDATION', {
        message: 'Test error',
        functionName: 'testFn',
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toBe(
        'Expected RangeLinkError to match all properties:\n  Cause: expected undefined, received error with message "Original error"',
      );
    });

    it('passes when both error and expected have undefined cause', () => {
      const error = new RangeLinkError({
        code: RangeLinkErrorCodes.VALIDATION,
        message: 'Test error',
        functionName: 'testFn',
      });

      expect(error).toBeRangeLinkError('VALIDATION', {
        message: 'Test error',
        functionName: 'testFn',
      });
    });

    it('passes when expected specifies cause and error has matching cause', () => {
      const causeError = new Error('Original error');
      const error = new RangeLinkError({
        code: RangeLinkErrorCodes.VALIDATION,
        message: 'Test error',
        functionName: 'testFn',
        cause: causeError,
      });

      expect(error).toBeRangeLinkError('VALIDATION', {
        message: 'Test error',
        functionName: 'testFn',
        cause: causeError,
      });
    });
  });
});

describe('toBeRangeLinkErrorErr matcher', () => {
  describe('negative validation for details', () => {
    it('fails when error has details but expected does not specify it', () => {
      const error = new RangeLinkError({
        code: RangeLinkErrorCodes.VALIDATION,
        message: 'Test error',
        functionName: 'testFn',
        details: { key: 'value' },
      });
      const resultErr = Result.err(error);

      const result = toBeRangeLinkErrorErr(resultErr, 'VALIDATION', {
        message: 'Test error',
        functionName: 'testFn',
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toBe(
        'Expected RangeLinkError to match all properties:\n  Details: expected undefined, received {"key":"value"}',
      );
    });

    it('fails with diff when expected specifies details that do not match', () => {
      const error = new RangeLinkError({
        code: RangeLinkErrorCodes.VALIDATION,
        message: 'Test error',
        functionName: 'testFn',
        details: { key: 'actual' },
      });
      const resultErr = Result.err(error);

      const result = toBeRangeLinkErrorErr(resultErr, 'VALIDATION', {
        message: 'Test error',
        functionName: 'testFn',
        details: { key: 'expected' },
      });

      expect(result.pass).toBe(false);
      const msg = result.message();
      expect(msg).toContain('Details (toStrictEqual):');
      expect(msg).toContain('"key": "expected"');
      expect(msg).toContain('"key": "actual"');
      expect(msg).toContain('diff:');
    });
  });

  describe('negative validation for cause', () => {
    it('fails when error has cause but expected does not specify it', () => {
      const causeError = new Error('Original error');
      const error = new RangeLinkError({
        code: RangeLinkErrorCodes.VALIDATION,
        message: 'Test error',
        functionName: 'testFn',
        cause: causeError,
      });
      const resultErr = Result.err(error);

      const result = toBeRangeLinkErrorErr(resultErr, 'VALIDATION', {
        message: 'Test error',
        functionName: 'testFn',
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toBe(
        'Expected RangeLinkError to match all properties:\n  Cause: expected undefined, received error with message "Original error"',
      );
    });
  });
});

describe('toThrowRangeLinkError matcher', () => {
  describe('negative validation for details', () => {
    it('fails when thrown error has details but expected does not specify it', () => {
      const throwFn = () => {
        throw new RangeLinkError({
          code: RangeLinkErrorCodes.VALIDATION,
          message: 'Test error',
          functionName: 'testFn',
          details: { key: 'value' },
        });
      };

      const result = toThrowRangeLinkError(throwFn, 'VALIDATION', {
        message: 'Test error',
        functionName: 'testFn',
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toBe(
        'Expected RangeLinkError to match all properties:\n  Details: expected undefined, received {"key":"value"}',
      );
    });

    it('fails with diff when thrown error has mismatched details', () => {
      const throwFn = () => {
        throw new RangeLinkError({
          code: RangeLinkErrorCodes.VALIDATION,
          message: 'Test error',
          functionName: 'testFn',
          details: { key: 'actual' },
        });
      };

      const result = toThrowRangeLinkError(throwFn, 'VALIDATION', {
        message: 'Test error',
        functionName: 'testFn',
        details: { key: 'expected' },
      });

      expect(result.pass).toBe(false);
      const msg = result.message();
      expect(msg).toContain('Details (toStrictEqual):');
      expect(msg).toContain('"key": "expected"');
      expect(msg).toContain('"key": "actual"');
      expect(msg).toContain('diff:');
    });
  });

  describe('negative validation for cause', () => {
    it('fails when thrown error has cause but expected does not specify it', () => {
      const causeError = new Error('Original error');
      const throwFn = () => {
        throw new RangeLinkError({
          code: RangeLinkErrorCodes.VALIDATION,
          message: 'Test error',
          functionName: 'testFn',
          cause: causeError,
        });
      };

      const result = toThrowRangeLinkError(throwFn, 'VALIDATION', {
        message: 'Test error',
        functionName: 'testFn',
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toBe(
        'Expected RangeLinkError to match all properties:\n  Cause: expected undefined, received error with message "Original error"',
      );
    });
  });
});
