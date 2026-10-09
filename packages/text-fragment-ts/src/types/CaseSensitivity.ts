/**
 * How a match compares directive text with document text.
 *
 * A browser matches text fragments without regard to case, so `insensitive` is
 * the default. A host that wants case to matter, which RangeLink does, asks for
 * `sensitive` in its own package rather than in the document model.
 */
export type CaseSensitivity = 'sensitive' | 'insensitive';
