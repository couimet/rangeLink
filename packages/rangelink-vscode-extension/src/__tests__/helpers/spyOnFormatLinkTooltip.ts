import * as formatLinkTooltipModule from '../../utils/formatLinkTooltip';

export const spyOnFormatLinkTooltip = (): jest.SpyInstance =>
  jest.spyOn(formatLinkTooltipModule, 'formatLinkTooltip');
