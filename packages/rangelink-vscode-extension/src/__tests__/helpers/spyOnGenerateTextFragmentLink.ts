import * as generateTextFragmentLinkModule from '../../utils/generateTextFragmentLink';

export const spyOnGenerateTextFragmentLink = (): jest.SpyInstance => jest.spyOn(generateTextFragmentLinkModule, 'generateTextFragmentLink');
