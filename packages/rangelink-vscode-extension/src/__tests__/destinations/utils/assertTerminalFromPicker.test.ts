import { createMockLogger } from 'barebone-logger-testing';

import { assertTerminalFromPicker } from '../../../destinations/utils/assertTerminalFromPicker';
import type { BindableQuickPickItem } from '../../../types';
import { createMockTerminal } from '../../helpers';

describe('assertTerminalFromPicker', () => {
  describe('when terminal exists in bindOptions', () => {
    it('executes action with validated terminal and returns result', () => {
      const terminal = createMockTerminal({ name: 'test-terminal' });
      const selected: BindableQuickPickItem = {
        label: 'test-terminal',
        displayName: 'test-terminal',
        itemKind: 'bindable',
        bindOptions: { kind: 'terminal', terminal },
      };
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
        { fn: 'TestFunction', selected },
        'Terminal validated',
      );
    });
  });

  describe('when terminal is missing from bindOptions', () => {
    it('throws RangeLinkExtensionError with TERMINAL_ITEM_MISSING_REFERENCE', () => {
      const selected = {
        label: 'no-terminal-item',
        displayName: 'no-terminal-item',
        itemKind: 'bindable',
        bindOptions: { kind: 'cursor-ai' },
      } as unknown as BindableQuickPickItem;
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
        message: 'Terminal item missing terminal reference in bindOptions',
        functionName: 'BrokenFunction',
        details: { selected },
      });
    });

    it('does not execute action when terminal is missing', () => {
      const selected = {
        label: 'missing-terminal',
        displayName: 'missing-terminal',
        itemKind: 'bindable',
        bindOptions: { kind: 'claude-code' },
      } as unknown as BindableQuickPickItem;
      const logger = createMockLogger();
      const action = jest.fn();

      expect(() =>
        assertTerminalFromPicker(selected, 'TestFn', logger, 'msg', action),
      ).toThrowRangeLinkExtensionError('TERMINAL_ITEM_MISSING_REFERENCE', {
        message: 'Terminal item missing terminal reference in bindOptions',
        functionName: 'TestFn',
        details: { selected },
      });

      expect(action).not.toHaveBeenCalled();
    });

    it('does not log when terminal is missing', () => {
      const selected = {
        label: 'missing-terminal',
        displayName: 'missing-terminal',
        itemKind: 'bindable',
        bindOptions: { kind: 'text-editor', editor: {} },
      } as unknown as BindableQuickPickItem;
      const logger = createMockLogger();

      expect(() =>
        assertTerminalFromPicker(selected, 'TestFn', logger, 'msg', () => undefined),
      ).toThrowRangeLinkExtensionError('TERMINAL_ITEM_MISSING_REFERENCE', {
        message: 'Terminal item missing terminal reference in bindOptions',
        functionName: 'TestFn',
        details: { selected },
      });

      expect(logger.debug).not.toHaveBeenCalled();
    });
  });
});
