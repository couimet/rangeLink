import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import { DEFAULT_DELIMITERS } from 'rangelink-core-ts';

import { createMockConfigGetter, createMockErrorFeedbackProvider } from '../../__tests__/helpers';
import { getDelimitersForExtension } from '../getDelimitersForExtension';

let logger: Logger;

describe('getDelimitersForExtension', () => {
  beforeEach(() => {
    logger = createMockLogger();
  });

  describe('valid configuration', () => {
    it('should load valid default delimiters without showing error', () => {
      const config = createMockConfigGetter({
        'delimiterLine': 'L',
        'delimiterPosition': 'C',
        'delimiterHash': '#',
        'delimiterRange': '-',
      });
      const errorFeedbackProvider = createMockErrorFeedbackProvider();

      const result = getDelimitersForExtension(config, errorFeedbackProvider, logger);

      expect(result).toStrictEqual({
        line: 'L',
        position: 'C',
        hash: '#',
        range: '-',
      });
      expect(errorFeedbackProvider.showErrorMessage).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should load valid custom delimiters without showing error', () => {
      const config = createMockConfigGetter({
        'delimiterLine': 'LINE',
        'delimiterPosition': 'COL',
        'delimiterHash': '$',
        'delimiterRange': 'TO',
      });
      const errorFeedbackProvider = createMockErrorFeedbackProvider();

      const result = getDelimitersForExtension(config, errorFeedbackProvider, logger);

      expect(result).toStrictEqual({
        line: 'LINE',
        position: 'COL',
        hash: '$',
        range: 'TO',
      });
      expect(errorFeedbackProvider.showErrorMessage).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should use defaults when no config is provided', () => {
      const config = createMockConfigGetter({});
      const errorFeedbackProvider = createMockErrorFeedbackProvider();

      const result = getDelimitersForExtension(config, errorFeedbackProvider, logger);

      expect(result).toStrictEqual(DEFAULT_DELIMITERS);
      expect(errorFeedbackProvider.showErrorMessage).not.toHaveBeenCalled();
    });
  });

  describe('invalid configuration', () => {
    it('should show error message when configuration has validation errors', () => {
      const config = createMockConfigGetter({
        'delimiterLine': 'L',
        'delimiterPosition': 'L',
        'delimiterHash': '#',
        'delimiterRange': '-',
      });
      const errorFeedbackProvider = createMockErrorFeedbackProvider();

      const result = getDelimitersForExtension(config, errorFeedbackProvider, logger);

      expect(result).toStrictEqual(DEFAULT_DELIMITERS);
      expect(errorFeedbackProvider.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Invalid delimiter configuration. Using defaults. Check Output → RangeLink for details.',
      );
      expect(errorFeedbackProvider.showErrorMessage).toHaveBeenCalledTimes(1);
    });

    it('should show error when delimiter contains numbers', () => {
      const config = createMockConfigGetter({
        'delimiterLine': 'L2',
        'delimiterPosition': 'C',
        'delimiterHash': '#',
        'delimiterRange': '-',
      });
      const errorFeedbackProvider = createMockErrorFeedbackProvider();

      const result = getDelimitersForExtension(config, errorFeedbackProvider, logger);

      expect(result).toStrictEqual(DEFAULT_DELIMITERS);
      expect(errorFeedbackProvider.showErrorMessage).toHaveBeenCalledTimes(1);
    });

    it('should show error when delimiter is empty string', () => {
      const config = createMockConfigGetter({
        'delimiterLine': '',
        'delimiterPosition': 'C',
        'delimiterHash': '#',
        'delimiterRange': '-',
      });
      const errorFeedbackProvider = createMockErrorFeedbackProvider();

      const result = getDelimitersForExtension(config, errorFeedbackProvider, logger);

      expect(result).toStrictEqual(DEFAULT_DELIMITERS);
      expect(errorFeedbackProvider.showErrorMessage).toHaveBeenCalledTimes(1);
    });

    it('should show error when delimiters have substring conflicts', () => {
      const config = createMockConfigGetter({
        'delimiterLine': 'L',
        'delimiterPosition': 'LINE',
        'delimiterHash': '#',
        'delimiterRange': '-',
      });
      const errorFeedbackProvider = createMockErrorFeedbackProvider();

      const result = getDelimitersForExtension(config, errorFeedbackProvider, logger);

      expect(result).toStrictEqual(DEFAULT_DELIMITERS);
      expect(errorFeedbackProvider.showErrorMessage).toHaveBeenCalledTimes(1);
    });

    it('should log validation errors', () => {
      const config = createMockConfigGetter({
        'delimiterLine': 'L',
        'delimiterPosition': 'L',
        'delimiterHash': '#',
        'delimiterRange': '-',
      });
      const errorFeedbackProvider = createMockErrorFeedbackProvider();

      getDelimitersForExtension(config, errorFeedbackProvider, logger);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle partial configuration with some valid and some invalid delimiters', () => {
      const config = createMockConfigGetter({
        'delimiterLine': 'L',
        'delimiterPosition': '123',
      });
      const errorFeedbackProvider = createMockErrorFeedbackProvider();

      const result = getDelimitersForExtension(config, errorFeedbackProvider, logger);

      expect(result).toStrictEqual(DEFAULT_DELIMITERS);
      expect(errorFeedbackProvider.showErrorMessage).toHaveBeenCalledTimes(1);
    });

    it('should handle config with whitespace delimiters', () => {
      const config = createMockConfigGetter({
        'delimiterLine': ' ',
        'delimiterPosition': 'C',
        'delimiterHash': '#',
        'delimiterRange': '-',
      });
      const errorFeedbackProvider = createMockErrorFeedbackProvider();

      const result = getDelimitersForExtension(config, errorFeedbackProvider, logger);

      expect(result).toBeDefined();
    });
  });
});
