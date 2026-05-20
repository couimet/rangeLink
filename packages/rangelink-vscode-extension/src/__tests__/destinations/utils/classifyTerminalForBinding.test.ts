import type * as vscode from 'vscode';

import { classifyTerminalForBinding } from '../../../destinations/utils';
import { createMockTerminal } from '../../helpers';

const minimalPty: vscode.Pseudoterminal = {
  onDidWrite: jest.fn(),
  open: jest.fn(),
  close: jest.fn(),
};

describe('classifyTerminalForBinding', () => {
  describe('rejects entirely (visible: false)', () => {
    it('classifies null terminal as not visible', () => {
      expect(classifyTerminalForBinding(null)).toStrictEqual({ visible: false });
    });

    it('classifies undefined terminal as not visible', () => {
      expect(classifyTerminalForBinding(undefined)).toStrictEqual({ visible: false });
    });

    it('classifies terminal with exited process as not visible', () => {
      const terminal = createMockTerminal({
        name: 'dead',
        exitStatus: { code: 0, reason: 1 },
      });
      expect(classifyTerminalForBinding(terminal)).toStrictEqual({ visible: false });
    });

    it('classifies terminal with non-zero exit code as not visible', () => {
      const terminal = createMockTerminal({
        name: 'crashed',
        exitStatus: { code: 1, reason: 1 },
      });
      expect(classifyTerminalForBinding(terminal)).toStrictEqual({ visible: false });
    });

    it('classifies hideFromUser terminal as not visible', () => {
      const terminal = createMockTerminal({
        name: 'Cursor',
        exitStatus: undefined,
        creationOptions: { hideFromUser: true },
      });
      expect(classifyTerminalForBinding(terminal)).toStrictEqual({ visible: false });
    });
  });

  describe('bindable (visible: true, no reason)', () => {
    it('classifies live shell terminal as bindable', () => {
      const terminal = createMockTerminal({
        name: 'zsh',
        exitStatus: undefined,
        creationOptions: {},
      });
      expect(classifyTerminalForBinding(terminal)).toStrictEqual({ visible: true });
    });

    it('classifies live shell terminal with hideFromUser=false as bindable', () => {
      const terminal = createMockTerminal({
        name: 'zsh',
        exitStatus: undefined,
        creationOptions: { hideFromUser: false },
      });
      expect(classifyTerminalForBinding(terminal)).toStrictEqual({ visible: true });
    });

    it('classifies live shell terminal with hideFromUser=undefined as bindable', () => {
      const terminal = createMockTerminal({
        name: 'bash',
        exitStatus: undefined,
        creationOptions: { hideFromUser: undefined },
      });
      expect(classifyTerminalForBinding(terminal)).toStrictEqual({ visible: true });
    });
  });

  describe('visible but not bindable (extension-managed)', () => {
    it('classifies pty terminal as visible with nonBindableReason extension-managed', () => {
      const terminal = createMockTerminal({
        name: 'Jest (rangeLink-002)',
        exitStatus: undefined,
        creationOptions: { name: 'Jest (rangeLink-002)', pty: minimalPty },
      });
      expect(classifyTerminalForBinding(terminal)).toStrictEqual({
        visible: true,
        nonBindableReason: 'extension-managed',
      });
    });

    it('hideFromUser still wins over extension-managed', () => {
      const terminal = createMockTerminal({
        name: 'hidden-pty',
        exitStatus: undefined,
        creationOptions: { name: 'hidden-pty', pty: minimalPty, hideFromUser: true },
      });
      expect(classifyTerminalForBinding(terminal)).toStrictEqual({ visible: false });
    });

    it('exited extension-managed terminal is rejected entirely', () => {
      const terminal = createMockTerminal({
        name: 'finished-pty',
        exitStatus: { code: 0, reason: 1 },
        creationOptions: { name: 'finished-pty', pty: minimalPty },
      });
      expect(classifyTerminalForBinding(terminal)).toStrictEqual({ visible: false });
    });
  });
});
