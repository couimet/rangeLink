/**
 * Common error codes shared across all our projects.
 * Projects have the responsibility to extend this enum with their own error codes that are specific to their business logic.
 *
 * Extending an enum and a TypeScript type is demonstrated in https://stackblitz.com/edit/typescript-3xheja?file=index.ts.
 * This StackBlitz link comes from https://stackoverflow.com/a/64549988/2965062.
 *
 * IMPORTANT CAVEAT TO BE AWARE OF:
 * this hacky way to extend an enum is not 100% safe: the same enum key could be defined in 2 enums and the LAST ONE TO SPREAD WILL WIN.
 *
 * `SharedErrorCodes` must be spread in SECOND position; like this:
 * const Errors = { ...ServiceSpecificErrors, ...SharedErrorCodes };
 *
 * Example that illustrates the problem (forked from the StackBlitz linked above):
 * enum Color1 {
 *   Red = 'Red',
 *   Green = 'Green',
 * }
 * enum Color2 {
 *   Yellow = 'Yellow',
 *   Green = 'Blue', // NOTICE THIS: this will override the previous enum key 'Green' with value 'Blue'
 * }
 *
 * type Colors = Color1 | Color2;
 * const Colors = { ...Color1, ...Color2 };
 *
 * let color: Colors = Colors.Green; // THIS VALUE WILL BE 'Blue' -- WRONG
 *
 * ===============================================================
 *
 * BUT, if Color1 is spread in SECOND position, the value will be 'Green' as expected:
 * const Colors = { ...Color2, ...Color1 };
 *
 * let color: Colors = Colors.Green; // THIS VALUE WILL BE 'Green' -- GOOD
 */
export enum SharedErrorCodes {
  //
  // Please keep alphabetical order; this will significantly ease maintenance and lookups in this file
  //
  /**
   * The execution of a request led to an unexpected situation/edge case.
   * Given the edge-case nature of this situation, we didn't want to create too many error codes and be able to re-use this one from time to time.
   * In this context, using a generic error code would be enough and, importantly, decrease noise in the exported error codes visible to the client.
   * This is one of those edge-case situations where our post-bug investigations would need to rely on the error msgs (instead of the error codes).
   * Relying on the error msg wouldn't be a problem because they won't be visible to the users.
   */
  UNEXPECTED_CODE_PATH = 'UNEXPECTED_CODE_PATH',

  /**
   * Should be used as a last resort; specialized/more precise error codes should instead be used
   */
  UNKNOWN = 'UNKNOWN',

  /**
   * Should be used whenever invalid data provided from an external input is encountered.
   */
  VALIDATION = 'VALIDATION',

  //
  // Please keep alphabetical order; this will significantly ease maintenance and lookups in this file
  //
}
