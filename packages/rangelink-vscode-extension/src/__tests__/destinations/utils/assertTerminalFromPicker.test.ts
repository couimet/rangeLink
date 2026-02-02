import { createMockLogger } from 'barebone-logger-testing';

import { assertTerminalFromPicker } from '../../../destinations/utils/assertTerminalFromPicker';
import { createMockTerminal } from '../../helpers';

describe('assertTerminalFromPicker', () => {
  describe('when terminal exists', () => {
    it('executes action with validated terminal and returns result', () => {
      const terminal = createMockTerminal({ name: 'test-terminal' });
      const selected = { label: 'test-terminal', terminal };
      const logger = createMockLogger();

      const result = assertTerminalFromPicker(
        selected,
        'TestFunction',
        logger,
        'Terminal validated',
        (t) => ({ outcome: 'success', terminal: t }),
      );

      expect(result).toStrictEqual({ outcome: 'success', terminal });

      expect(logger.debug).toHaveBeenCalledWith(
        { fn: 'TestFunction', selected: { label: 'test-terminal', terminal } },
        'Terminal validated',
      );
    });
  });

  describe('when terminal is missing', () => {
    it('throws RangeLinkExtensionError with TERMINAL_ITEM_MISSING_REFERENCE', () => {
      const selected = { label: 'no-terminal-item' };
      const logger = createMockLogger();

      expect(() =>
        assertTerminalFromPicker(
          selected,
          'BrokenFunction',
          logger,
          'Should not log',
          () => undefined,
        ),
      ).toThrowRangeLinkExtensionError('TERMINAL_ITEM_MISSING_REFERENCE', {
        message: 'Terminal item missing terminal reference',
        functionName: 'BrokenFunction',
      });
    });

    it('does not execute action when terminal is missing', () => {
      const selected = { label: 'missing-terminal' };
      const logger = createMockLogger();
      const action = jest.fn();

      expect(() =>
        assertTerminalFromPicker(selected, 'TestFn', logger, 'msg', action),
      ).toThrowRangeLinkExtensionError('TERMINAL_ITEM_MISSING_REFERENCE', {
        message: 'Terminal item missing terminal reference',
        functionName: 'TestFn',
      });

      expect(action).not.toHaveBeenCalled();
    });

    it('does not log when terminal is missing', () => {
      const selected = { label: 'missing-terminal' };
      const logger = createMockLogger();

      expect(() =>
        assertTerminalFromPicker(selected, 'TestFn', logger, 'msg', () => undefined),
      ).toThrowRangeLinkExtensionError('TERMINAL_ITEM_MISSING_REFERENCE', {
        message: 'Terminal item missing terminal reference',
        functionName: 'TestFn',
      });

      expect(logger.debug).not.toHaveBeenCalled();
    });
  });
});
