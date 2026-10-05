/**
 * One place in a document where a directive resolves.
 *
 * `start` and `end` are half-open RAW document offsets, so `end` is the first
 * code unit after the match and the match text is `rawText.slice(start, end)`.
 * They are UTF-16 code-unit indices, which is what VS Code's
 * `document.positionAt` expects.
 */
export interface MatchCandidate {
  /** Raw offset of the match's first code unit. */
  start: number;
  /** Raw offset one past the match's last code unit. */
  end: number;
}
