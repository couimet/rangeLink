import * as textFragmentModule from 'text-fragment-ts';

export const spyOnFormatTextFragment = (): jest.SpyInstance => jest.spyOn(textFragmentModule, 'formatTextFragment');
