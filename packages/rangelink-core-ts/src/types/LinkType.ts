/**
 * Specifies the type of link to generate
 */
export enum LinkType {
  /**
   * Standard RangeLink without embedded delimiter metadata
   */
  Regular = 'regular',

  /**
   * Portable RangeLink with embedded delimiter metadata (BYOD format)
   */
  Portable = 'portable',
}
