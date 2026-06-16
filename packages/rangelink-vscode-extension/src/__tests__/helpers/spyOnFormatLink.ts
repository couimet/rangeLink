import * as rangelinkCoreModule from 'rangelink-core-ts';

export const spyOnFormatLink = (): jest.SpyInstance =>
  jest.spyOn(rangelinkCoreModule, 'formatLink');
