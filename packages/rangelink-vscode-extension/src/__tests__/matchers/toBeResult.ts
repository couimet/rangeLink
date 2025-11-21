import type { Result } from 'rangelink-core-ts';

/**
 * Custom Jest matcher for Result.ok() - verifies result is successful
 */
export const toBeOk = (received: Result<unknown, unknown>) => {
  const pass = received.success === true;
  return {
    pass,
    message: () =>
      pass
        ? `Expected result to be an error, but it succeeded with value: ${JSON.stringify(received.value)}`
        : `Expected result to be successful, but it failed with error: ${received.error}`,
  };
};

/**
 * Custom Jest matcher for Result.ok() with value assertion
 */
export const toBeOkWith = <T>(
  received: Result<T, unknown>,
  assertValue: (value: T) => void,
) => {
  if (!received.success) {
    return {
      pass: false,
      message: () => `Expected result to be successful, but it failed with error: ${received.error}`,
    };
  }

  try {
    assertValue(received.value);
    return {
      pass: true,
      message: () => 'Result is successful and value assertions passed',
    };
  } catch (error) {
    return {
      pass: false,
      message: () =>
        `Result is successful but value assertions failed:\n${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Custom Jest matcher for Result.err() - verifies result is an error
 */
export const toBeErr = (received: Result<unknown, unknown>) => {
  const pass = received.success === false;
  return {
    pass,
    message: () =>
      pass
        ? `Expected result to be successful, but it failed with error: ${received.error}`
        : `Expected result to be an error, but it succeeded with value: ${JSON.stringify(received.value)}`,
  };
};

/**
 * Custom Jest matcher for Result.err() with error assertion
 */
export const toBeErrWith = <E>(received: Result<unknown, E>, assertError: (error: E) => void) => {
  if (received.success) {
    return {
      pass: false,
      message: () =>
        `Expected result to be an error, but it succeeded with value: ${JSON.stringify(received.value)}`,
    };
  }

  try {
    assertError(received.error);
    return {
      pass: true,
      message: () => 'Result is an error and error assertions passed',
    };
  } catch (error) {
    return {
      pass: false,
      message: () =>
        `Result is an error but error assertions failed:\n${error instanceof Error ? error.message : String(error)}`,
    };
  }
};
