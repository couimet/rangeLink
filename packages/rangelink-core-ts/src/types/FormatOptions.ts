import { LinkType } from './LinkType';
import { RangeNotation } from './RangeNotation';

/**
 * Optional formatting parameters for link generation.
 */
export interface FormatOptions {
  /**
   * Controls range notation format.
   * See RangeNotation enum for detailed behavior.
   * Defaults to RangeNotation.Auto if not specified.
   */
  readonly notation?: RangeNotation;

  /**
   * Type of link to generate.
   * See LinkType enum for options.
   * Defaults to LinkType.Regular if not specified.
   */
  readonly linkType?: LinkType;
}
