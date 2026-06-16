import * as rangelinkCoreModule from 'rangelink-core-ts';

export const spyOnFindLinksInText = (): jest.SpyInstance =>
  jest.spyOn(rangelinkCoreModule, 'findLinksInText');
