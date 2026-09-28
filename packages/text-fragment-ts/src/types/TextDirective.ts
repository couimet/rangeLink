/**
 * A parsed text fragment directive: `text=[prefix-,]start[,end][,-suffix]`.
 *
 * Every term is the percent-decoded literal text as it appears in the document.
 * `prefix`, `end`, and `suffix` are absent when the source directive omitted
 * them. RangeLink's matcher applies CRLF normalization itself; this type holds
 * decoded text only.
 */
export interface TextDirective {
  /**
   * Context term that must immediately precede `start` in the document.
   * The selected range excludes it.
   */
  prefix?: string;

  /**
   * Required match term; the text the link identifies.
   */
  start: string;

  /**
   * Optional end term. When present, the range spans from the end of `start`
   * through the end of the `end` occurrence that follows it.
   */
  end?: string;

  /**
   * Context term that must immediately follow the matched range's end in the
   * document. The selected range excludes it.
   */
  suffix?: string;
}
