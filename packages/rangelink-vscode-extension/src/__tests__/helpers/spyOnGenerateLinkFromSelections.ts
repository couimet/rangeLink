import * as generateLinkModule from '../../utils/generateLinkFromSelections';

export const spyOnGenerateLinkFromSelections = (): jest.SpyInstance =>
  jest.spyOn(generateLinkModule, 'generateLinkFromSelections');
