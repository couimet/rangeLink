import * as rangelinkCoreModule from 'rangelink-core-ts';

export const spyOnFormatHighlightLink = (): jest.SpyInstance => jest.spyOn(rangelinkCoreModule, 'formatHighlightLink');
