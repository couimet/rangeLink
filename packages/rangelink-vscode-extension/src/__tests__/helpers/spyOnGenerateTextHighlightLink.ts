import * as generateTextHighlightLinkModule from '../../utils/generateTextHighlightLink';

export const spyOnGenerateTextHighlightLink = (): jest.SpyInstance => jest.spyOn(generateTextHighlightLinkModule, 'generateTextHighlightLink');
