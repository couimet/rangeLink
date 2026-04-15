import { interpolateArgs } from '../interpolateArgs';

const LINK_TEXT = 'src/app.ts#L10-L20';

describe('interpolateArgs', () => {
  describe('string templates', () => {
    it('replaces exact ${content} placeholder with content', () => {
      expect(interpolateArgs('${content}', LINK_TEXT)).toBe('src/app.ts#L10-L20');
    });

    it('replaces ${content} within a larger string', () => {
      expect(interpolateArgs('prefix-${content}-suffix', LINK_TEXT)).toBe(
        'prefix-src/app.ts#L10-L20-suffix',
      );
    });

    it('returns string unchanged when no placeholder present', () => {
      expect(interpolateArgs('no-placeholder', LINK_TEXT)).toBe('no-placeholder');
    });

    it('returns empty string unchanged', () => {
      expect(interpolateArgs('', LINK_TEXT)).toBe('');
    });
  });

  describe('array templates', () => {
    it('interpolates each element in an array', () => {
      expect(interpolateArgs(['${content}', 'static'], LINK_TEXT)).toStrictEqual([
        'src/app.ts#L10-L20',
        'static',
      ]);
    });

    it('handles empty array', () => {
      expect(interpolateArgs([], LINK_TEXT)).toStrictEqual([]);
    });

    it('handles nested arrays', () => {
      expect(interpolateArgs([['${content}']], LINK_TEXT)).toStrictEqual([['src/app.ts#L10-L20']]);
    });
  });

  describe('object templates', () => {
    it('interpolates string values in an object', () => {
      expect(interpolateArgs({ text: '${content}', format: 'markdown' }, LINK_TEXT)).toStrictEqual({
        text: 'src/app.ts#L10-L20',
        format: 'markdown',
      });
    });

    it('handles nested objects', () => {
      expect(interpolateArgs({ outer: { inner: '${content}' } }, LINK_TEXT)).toStrictEqual({
        outer: { inner: 'src/app.ts#L10-L20' },
      });
    });

    it('handles empty object', () => {
      expect(interpolateArgs({}, LINK_TEXT)).toStrictEqual({});
    });
  });

  describe('mixed structures', () => {
    it('interpolates through objects containing arrays', () => {
      expect(
        interpolateArgs({ items: ['${content}', 'other'], label: '${content}' }, LINK_TEXT),
      ).toStrictEqual({
        items: ['src/app.ts#L10-L20', 'other'],
        label: 'src/app.ts#L10-L20',
      });
    });

    it('interpolates through arrays containing objects', () => {
      expect(
        interpolateArgs([{ text: '${content}' }, { text: 'static' }], LINK_TEXT),
      ).toStrictEqual([{ text: 'src/app.ts#L10-L20' }, { text: 'static' }]);
    });
  });

  describe('non-string leaves', () => {
    it('passes through numbers unchanged', () => {
      expect(interpolateArgs(42, LINK_TEXT)).toBe(42);
    });

    it('passes through booleans unchanged', () => {
      expect(interpolateArgs(true, LINK_TEXT)).toBe(true);
    });

    it('passes through null unchanged', () => {
      expect(interpolateArgs(null, LINK_TEXT)).toBeNull();
    });

    it('passes through undefined unchanged', () => {
      expect(interpolateArgs(undefined, LINK_TEXT)).toBeUndefined();
    });

    it('preserves non-string values inside objects', () => {
      expect(
        interpolateArgs({ text: '${content}', count: 5, enabled: true }, LINK_TEXT),
      ).toStrictEqual({
        text: 'src/app.ts#L10-L20',
        count: 5,
        enabled: true,
      });
    });
  });
});
