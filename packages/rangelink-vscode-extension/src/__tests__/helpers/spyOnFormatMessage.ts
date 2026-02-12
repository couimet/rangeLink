import * as formatMessageModule from '../../utils/formatMessage';

export const spyOnFormatMessage = (): jest.SpyInstance =>
  jest.spyOn(formatMessageModule, 'formatMessage');
