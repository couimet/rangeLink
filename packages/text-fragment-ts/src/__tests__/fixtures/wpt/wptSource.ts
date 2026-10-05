/**
 * Ported from web-platform-tests, which is distributed under the 3-Clause BSD
 * license. See the NOTICE file at the repository root.
 *
 * Every case in this directory names the exact source line it was transcribed
 * from, so a reader can compare the port against the corpus it came from.
 */

/**
 * The web-platform-tests revision the ported corpus was transcribed from.
 *
 * `wptPermalink` embeds this revision, so a permalink always lands on the lines
 * this port was written against, whatever the upstream files do afterwards.
 */
export const WPT_REVISION = '7f439c226694df407f6ae71b7a86a3794cc67776';

const WPT_CORPUS_URL = `https://github.com/web-platform-tests/wpt/blob/${WPT_REVISION}/scroll-to-text-fragment`;

/**
 * Build a permanent link to the first line of one case in the corpus.
 */
export const wptPermalink = (file: string, line: number): string => `${WPT_CORPUS_URL}/${file}#L${line}`;
