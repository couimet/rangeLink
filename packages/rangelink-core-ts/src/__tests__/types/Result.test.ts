import { RangeLinkError } from '../../errors/RangeLinkError';
import { RangeLinkErrorCodes } from '../../errors/RangeLinkErrorCodes';
import { Result } from '../../types/Result';

describe('Result Value Object', () => {
  describe('Factory methods', () => {
    describe('Result.ok', () => {
      it('should create a successful Result with a value', () => {
        const result = Result.ok(42);

        expect(result.success).toBe(true);
        expect(result.value).toBe(42);
      });

      it('should create a successful Result with string value', () => {
        const result = Result.ok('hello');

        expect(result.success).toBe(true);
        expect(result.value).toBe('hello');
      });

      it('should create a successful Result with object value', () => {
        const obj = { foo: 'bar', num: 123 };
        const result = Result.ok(obj);

        expect(result.success).toBe(true);
        expect(result.value).toStrictEqual(obj);
      });

      it('should create a successful Result with null value', () => {
        const result = Result.ok(null);

        expect(result.success).toBe(true);
        expect(result.value).toBe(null);
      });

      it('should create a successful Result with undefined value', () => {
        const result = Result.ok(undefined);

        expect(result.success).toBe(true);
        expect(result.value).toBe(undefined);
      });
    });

    describe('Result.err', () => {
      it('should create an error Result with an error', () => {
        const error = new Error('test error');
        const result = Result.err(error);

        expect(result.success).toBe(false);
        expect(result.error).toBe(error);
      });

      it('should create an error Result with string error', () => {
        const result = Result.err('error message');

        expect(result.success).toBe(false);
        expect(result.error).toBe('error message');
      });

      it('should create an error Result with RangeLinkError', () => {
        const error = new RangeLinkError({
          code: RangeLinkErrorCodes.PARSE_EMPTY_LINK,
          message: 'Link cannot be empty',
          functionName: 'parseLink',
        });
        const result = Result.err(error);

        expect(result.success).toBe(false);
        expect(result.error).toBe(error);
      });
    });
  });

  describe('Getters', () => {
    describe('.success', () => {
      it('should return true for ok Results', () => {
        const result = Result.ok(42);
        expect(result.success).toBe(true);
      });

      it('should return false for err Results', () => {
        const result = Result.err('error');
        expect(result.success).toBe(false);
      });
    });

    describe('.value', () => {
      it('should return value for ok Results', () => {
        const result = Result.ok(42);
        expect(result.value).toBe(42);
      });

      it('should return object value for ok Results', () => {
        const obj = { foo: 'bar', nested: { num: 123 } };
        const result = Result.ok(obj);
        expect(result.value).toStrictEqual(obj);
      });

      it('should throw RESULT_VALUE_ACCESS_ON_ERROR for err Results', () => {
        const result = Result.err('error message');

        expect(() => result.value).toThrowRangeLinkError('RESULT_VALUE_ACCESS_ON_ERROR', {
          message: 'Cannot access value on an error Result. Check .success before accessing .value',
          functionName: 'Result.value',
        });
      });

      it('should throw with correct error for err Results with RangeLinkError', () => {
        const error = new RangeLinkError({
          code: RangeLinkErrorCodes.PARSE_EMPTY_LINK,
          message: 'Link cannot be empty',
          functionName: 'parseLink',
        });
        const result = Result.err(error);

        expect(() => result.value).toThrowRangeLinkError('RESULT_VALUE_ACCESS_ON_ERROR', {
          message: 'Cannot access value on an error Result. Check .success before accessing .value',
          functionName: 'Result.value',
        });
      });
    });

    describe('.error', () => {
      it('should return error for err Results', () => {
        const error = new Error('test error');
        const result = Result.err(error);
        expect(result.error).toBe(error);
      });

      it('should return string error for err Results', () => {
        const result = Result.err('error message');
        expect(result.error).toBe('error message');
      });

      it('should return RangeLinkError for err Results', () => {
        const error = new RangeLinkError({
          code: RangeLinkErrorCodes.PARSE_EMPTY_LINK,
          message: 'Link cannot be empty',
          functionName: 'parseLink',
        });
        const result = Result.err(error);
        expect(result.error).toBe(error);
      });

      it('should throw RESULT_ERROR_ACCESS_ON_SUCCESS for ok Results', () => {
        const result = Result.ok(42);

        expect(() => result.error).toThrowRangeLinkError('RESULT_ERROR_ACCESS_ON_SUCCESS', {
          message: 'Cannot access error on a successful Result. Check .success before accessing .error',
          functionName: 'Result.error',
        });
      });

      it('should throw with correct error for ok Results with complex value', () => {
        const result = Result.ok({ foo: 'bar', num: 123 });

        expect(() => result.error).toThrowRangeLinkError('RESULT_ERROR_ACCESS_ON_SUCCESS', {
          message: 'Cannot access error on a successful Result. Check .success before accessing .error',
          functionName: 'Result.error',
        });
      });
    });
  });

  describe('Serialization', () => {
    describe('toJSON()', () => {
      it('should serialize ok Result correctly', () => {
        const result = Result.ok(42);
        const json = result.toJSON();

        expect(json).toStrictEqual({
          success: true,
          value: 42,
        });
      });

      it('should serialize ok Result with string value', () => {
        const result = Result.ok('hello');
        const json = result.toJSON();

        expect(json).toStrictEqual({
          success: true,
          value: 'hello',
        });
      });

      it('should serialize ok Result with object value', () => {
        const obj = { foo: 'bar', num: 123, nested: { deep: true } };
        const result = Result.ok(obj);
        const json = result.toJSON();

        expect(json).toStrictEqual({
          success: true,
          value: obj,
        });
      });

      it('should serialize ok Result with null value', () => {
        const result = Result.ok(null);
        const json = result.toJSON();

        expect(json).toStrictEqual({
          success: true,
          value: null,
        });
      });

      it('should serialize err Result correctly', () => {
        const error = new Error('test error');
        const result = Result.err(error);
        const json = result.toJSON();

        expect(json).toStrictEqual({
          success: false,
          error: error,
        });
      });

      it('should serialize err Result with string error', () => {
        const result = Result.err('error message');
        const json = result.toJSON();

        expect(json).toStrictEqual({
          success: false,
          error: 'error message',
        });
      });

      it('should serialize err Result with RangeLinkError', () => {
        const error = new RangeLinkError({
          code: RangeLinkErrorCodes.PARSE_EMPTY_LINK,
          message: 'Link cannot be empty',
          functionName: 'parseLink',
        });
        const result = Result.err(error);
        const json = result.toJSON();

        expect(json).toStrictEqual({
          success: false,
          error: error,
        });
      });

      it('should work with JSON.stringify', () => {
        const result = Result.ok({ foo: 'bar' });
        const jsonString = JSON.stringify(result);
        const parsed = JSON.parse(jsonString);

        expect(parsed).toStrictEqual({
          success: true,
          value: { foo: 'bar' },
        });
      });

      it('should work with JSON.stringify for error Result', () => {
        const result = Result.err('test error');
        const jsonString = JSON.stringify(result);
        const parsed = JSON.parse(jsonString);

        expect(parsed).toStrictEqual({
          success: false,
          error: 'test error',
        });
      });
    });
  });

  describe('Type safety', () => {
    it('should handle generic types correctly for ok Results', () => {
      interface TestData {
        id: number;
        name: string;
      }

      const data: TestData = { id: 1, name: 'test' };
      const result: Result<TestData, Error> = Result.ok(data);

      expect(result.success).toBe(true);
      if (result.success) {
        const value: TestData = result.value;
        expect(value.id).toBe(1);
        expect(value.name).toBe('test');
      }
    });

    it('should handle generic types correctly for err Results', () => {
      interface TestData {
        id: number;
        name: string;
      }

      const error = new Error('test error');
      const result: Result<TestData, Error> = Result.err(error);

      expect(result.success).toBe(false);
      if (!result.success) {
        const err: Error = result.error;
        expect(err.message).toBe('test error');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle Result with array value', () => {
      const arr = [1, 2, 3];
      const result = Result.ok(arr);

      expect(result.success).toBe(true);
      expect(result.value).toStrictEqual(arr);
    });

    it('should handle Result with Map value', () => {
      const map = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
      const result = Result.ok(map);

      expect(result.success).toBe(true);
      expect(result.value).toBe(map);
      expect(result.value.get('key1')).toBe('value1');
    });

    it('should handle Result with Set value', () => {
      const set = new Set([1, 2, 3]);
      const result = Result.ok(set);

      expect(result.success).toBe(true);
      expect(result.value).toBe(set);
      expect(result.value.has(2)).toBe(true);
    });

    it('should handle Result with function value', () => {
      const fn = (x: number) => x * 2;
      const result = Result.ok(fn);

      expect(result.success).toBe(true);
      expect(result.value).toBe(fn);
      expect(result.value(5)).toBe(10);
    });
  });

  describe('Constructor validation (internal invariants)', () => {
    describe('Defense in depth', () => {
      it('should verify Result.ok() does not trigger RESULT_INVALID_STATE', () => {
        // The constructor validates that success Results don't have errors
        // This test verifies Result.ok() correctly passes only value, not error
        expect(() => Result.ok(42)).not.toThrow();
        expect(() => Result.ok(null)).not.toThrow();
        expect(() => Result.ok(undefined)).not.toThrow();
      });

      it('should verify Result.err() does not trigger RESULT_INVALID_STATE', () => {
        // The constructor validates that error Results don't have values
        // This test verifies Result.err() correctly passes only error, not value
        expect(() => Result.err('error')).not.toThrow();
        expect(() => Result.err(new Error('test'))).not.toThrow();
      });
    });

    describe('Documentation: Constructor invariants', () => {
      it('documents that constructor prevents success=true with error defined', () => {
        // The private constructor throws RESULT_INVALID_STATE if:
        // - success === true
        // - error !== undefined
        //
        // This prevents invalid states like { success: true, error: 'oops' }
        //
        // Since the constructor is private, this is tested indirectly via
        // Result.ok() which should never pass an error parameter.
        //
        // If someone accidentally modifies Result.ok() to pass both value and error,
        // the constructor validation will catch it during testing.

        const result = Result.ok(42);
        expect(result.success).toBe(true);
        expect(() => result.error).toThrow(); // Validates getter also prevents access
      });

      it('documents that constructor prevents success=false with value defined', () => {
        // The private constructor throws RESULT_INVALID_STATE if:
        // - success === false
        // - value !== undefined
        //
        // This prevents invalid states like { success: false, value: 42 }
        //
        // Since the constructor is private, this is tested indirectly via
        // Result.err() which should never pass a value parameter.
        //
        // If someone accidentally modifies Result.err() to pass both value and error,
        // the constructor validation will catch it during testing.

        const result = Result.err('error');
        expect(result.success).toBe(false);
        expect(() => result.value).toThrow(); // Validates getter also prevents access
      });
    });
  });
});
