/**
 * Functional error handling type.
 * Represents either a successful value or an error.
 */
export type Result<T, E> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: E };

/**
 * Create a successful result.
 */
export function Ok<T>(value: T): Result<T, never> {
  return { success: true, value };
}

/**
 * Create an error result.
 */
export function Err<E>(error: E): Result<never, E> {
  return { success: false, error };
}
