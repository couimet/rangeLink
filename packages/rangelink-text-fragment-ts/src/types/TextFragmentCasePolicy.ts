import type { CaseSensitivity } from 'text-fragment-ts';

/**
 * How a match treats letter case.
 *
 * The codec's two values run the search once: `sensitive` compares exactly, and
 * `insensitive` ignores case. This package adds `prefer-sensitive`, which runs
 * the search case-sensitively first and retries case-insensitively only when
 * that pass found nothing. That is RangeLink's default: a link whose text is
 * written exactly as the document writes it resolves to that one place, and
 * only a link that matches nowhere is widened to every case variant.
 */
export type TextFragmentCasePolicy = CaseSensitivity | 'prefer-sensitive';
