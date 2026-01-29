import { RangeLinkError } from '../../errors/RangeLinkError';
import { RangeLinkErrorCodes } from '../../errors/RangeLinkErrorCodes';
import { Result } from '../../types/Result';
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
      expect(result.message()).toContain('Details: expected undefined');
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
      expect(result.message()).toContain('Cause: expected undefined');
      expect(result.message()).toContain('Original error');
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
      expect(result.message()).toContain('Details: expected undefined');
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
      expect(result.message()).toContain('Cause: expected undefined');
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
      expect(result.message()).toContain('Details: expected undefined');
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
      expect(result.message()).toContain('Cause: expected undefined');
    });
  });
});
