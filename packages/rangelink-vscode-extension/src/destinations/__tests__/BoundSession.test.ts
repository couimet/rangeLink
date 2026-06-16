import { createMockLogger } from '@couimet/logger-contract-testing';
import type * as vscode from 'vscode';

import {
  createMockEditorComposablePasteDestination,
  createMockSingletonComposablePasteDestination,
  createMockTerminalComposablePasteDestination,
  createMockUri,
} from '../../__tests__/helpers';
import { AutoPasteResult } from '../../types';
import { BoundSession } from '../BoundSession';

describe('BoundSession', () => {
  let mockEvents: {
    onDidCloseTerminal: jest.Mock;
    onDidCloseTextDocument: jest.Mock;
    onDidChangeTabs: jest.Mock;
  };
  let mockEditors: { findVisibleEditorsByUri: jest.Mock };
  let mockFeedback: {
    notifyAutoUnbind: jest.Mock;
    notifyDuplicateTabWarning: jest.Mock;
  };
  let mockLogger: ReturnType<typeof createMockLogger>;

  const createSession = (): BoundSession =>
    new BoundSession(mockEvents, mockEditors, mockFeedback, mockLogger);

  beforeEach(() => {
    mockEvents = {
      onDidCloseTerminal: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      onDidCloseTextDocument: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      onDidChangeTabs: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    };
    mockEditors = { findVisibleEditorsByUri: jest.fn().mockReturnValue([]) };
    mockFeedback = {
      notifyAutoUnbind: jest.fn(),
      notifyDuplicateTabWarning: jest.fn(),
    };
    mockLogger = createMockLogger();
  });

  // ── constructor ──────────────────────────────────────────────────

  describe('constructor', () => {
    it('subscribes to session-lifetime events on construction', () => {
      createSession();

      expect(mockEvents.onDidCloseTerminal).toHaveBeenCalledTimes(1);
      expect(mockEvents.onDidCloseTextDocument).toHaveBeenCalledTimes(1);
      expect(mockEvents.onDidChangeTabs).toHaveBeenCalledTimes(0);
    });
  });

  // ── get / isSet / getInfo ─────────────────────────────────────────

  describe('get', () => {
    it('returns undefined when nothing is bound', () => {
      const session = createSession();

      expect(session.get()).toBeUndefined();
    });

    it('returns the bound destination after set', () => {
      const session = createSession();
      const dest = createMockSingletonComposablePasteDestination({
        id: 'terminal',
        displayName: 'Terminal',
      });

      session.set(dest);

      expect(session.get()).toBe(dest);
    });

    it('returns undefined after set then clear', () => {
      const session = createSession();
      session.set(
        createMockSingletonComposablePasteDestination({ id: 'terminal', displayName: 'Terminal' }),
      );
      session.clear();

      expect(session.get()).toBeUndefined();
    });
  });

  describe('isSet', () => {
    it('returns false when nothing is bound', () => {
      const session = createSession();

      expect(session.isSet()).toBe(false);
    });

    it('returns true after set', () => {
      const session = createSession();
      session.set(
        createMockSingletonComposablePasteDestination({ id: 'terminal', displayName: 'Terminal' }),
      );

      expect(session.isSet()).toBe(true);
    });

    it('returns false after set then clear', () => {
      const session = createSession();
      session.set(
        createMockSingletonComposablePasteDestination({ id: 'terminal', displayName: 'Terminal' }),
      );
      session.clear();

      expect(session.isSet()).toBe(false);
    });
  });

  describe('getInfo', () => {
    it('returns undefined when nothing is bound', () => {
      const session = createSession();

      expect(session.getInfo()).toBeUndefined();
    });

    it('returns id and displayName when bound', () => {
      const session = createSession();
      session.set(
        createMockSingletonComposablePasteDestination({
          id: 'cursor-ai',
          displayName: 'Cursor AI Assistant',
        }),
      );

      expect(session.getInfo()).toStrictEqual({
        id: 'cursor-ai',
        displayName: 'Cursor AI Assistant',
      });
    });
  });

  // ── set ───────────────────────────────────────────────────────────

  describe('set', () => {
    it('fires onDidChange with bound destination info', () => {
      const session = createSession();
      const dest = createMockSingletonComposablePasteDestination({
        id: 'terminal',
        displayName: 'Terminal',
      });
      const listener = jest.fn();
      session.onDidChange(listener);

      session.set(dest);

      expect(session.get()).toBe(dest);
      expect(listener).toHaveBeenCalledWith({ id: 'terminal', displayName: 'Terminal' });
    });

    it('throws when set is called while already bound', () => {
      const session = createSession();
      session.set(
        createMockSingletonComposablePasteDestination({ id: 'terminal', displayName: 'Terminal' }),
      );

      expect(() =>
        session.set(
          createMockSingletonComposablePasteDestination({
            id: 'terminal',
            displayName: 'Terminal',
          }),
        ),
      ).toThrow('BoundSession.set() called while already bound. Call clear() first.');
    });
  });

  // ── clear ─────────────────────────────────────────────────────────

  describe('clear', () => {
    it('fires onDidChange with undefined', () => {
      const session = createSession();
      session.set(
        createMockSingletonComposablePasteDestination({ id: 'terminal', displayName: 'Terminal' }),
      );
      const listener = jest.fn();
      session.onDidChange(listener);

      session.clear();

      expect(listener).toHaveBeenCalledWith(undefined);
    });

    it('is safe to call when nothing is bound', () => {
      const session = createSession();

      session.clear();
      expect(session.isSet()).toBe(false);
    });

    it('disposes per-binding guards on clear', () => {
      const tabsDispose = jest.fn();
      mockEvents.onDidChangeTabs.mockReturnValue({ dispose: tabsDispose });

      const session = createSession();
      const dest = createMockEditorComposablePasteDestination({
        displayName: 'Text Editor ("test.ts")',
        uri: createMockUri('/test.ts'),
        viewColumn: 1,
      });

      session.set(dest);
      expect(mockEvents.onDidChangeTabs).toHaveBeenCalledTimes(2);

      session.clear();
      expect(tabsDispose).toHaveBeenCalledTimes(2);
    });
  });

  // ── Per-binding guards ───────────────────────────────────────────

  describe('per-binding guards', () => {
    it('creates tab-close and multi-column guards when binding an editor', () => {
      const session = createSession();
      const dest = createMockEditorComposablePasteDestination({
        displayName: 'Text Editor ("test.ts")',
        uri: createMockUri('/test.ts'),
        viewColumn: 1,
      });

      session.set(dest);

      expect(mockEvents.onDidChangeTabs).toHaveBeenCalledTimes(2);
    });

    it('does not create guards when binding a non-editor destination', () => {
      const session = createSession();
      const dest = createMockSingletonComposablePasteDestination({
        id: 'cursor-ai',
        displayName: 'Cursor AI',
      });

      session.set(dest);

      expect(mockEvents.onDidChangeTabs).toHaveBeenCalledTimes(0);
    });

    it('disposes guards and re-creates them on rebind', () => {
      const dispose1 = jest.fn();
      const dispose2 = jest.fn();
      mockEvents.onDidChangeTabs
        .mockReturnValueOnce({ dispose: dispose1 })
        .mockReturnValueOnce({ dispose: dispose2 });

      const session = createSession();
      const dest = createMockEditorComposablePasteDestination({
        displayName: 'Text Editor ("test.ts")',
        uri: createMockUri('/test.ts'),
        viewColumn: 1,
      });

      session.set(dest);
      expect(mockEvents.onDidChangeTabs).toHaveBeenCalledTimes(2);

      const dispose3 = jest.fn();
      const dispose4 = jest.fn();
      mockEvents.onDidChangeTabs
        .mockReturnValueOnce({ dispose: dispose3 })
        .mockReturnValueOnce({ dispose: dispose4 });

      session.clear();
      expect(dispose1).toHaveBeenCalledTimes(1);
      expect(dispose2).toHaveBeenCalledTimes(1);

      const newDest = createMockEditorComposablePasteDestination({
        displayName: 'Text Editor ("test.ts")',
        uri: createMockUri('/test.ts'),
        viewColumn: 1,
      });
      session.set(newDest);
      expect(mockEvents.onDidChangeTabs).toHaveBeenCalledTimes(4);
    });
  });

  // ── isClipboardRestorationApplicable ──────────────────────────────

  describe('isClipboardRestorationApplicable', () => {
    it('returns true when nothing is bound', () => {
      const session = createSession();

      expect(session.isClipboardRestorationApplicable(false)).toBe(true);
      expect(session.isClipboardRestorationApplicable(true)).toBe(true);
    });

    it('returns false when shouldPreserveClipboard returns false', () => {
      const session = createSession();
      const dest = createMockSingletonComposablePasteDestination({
        id: 'terminal',
        displayName: 'Terminal',
        shouldPreserveClipboard: jest.fn().mockReturnValue(false),
      });
      session.set(dest);

      expect(session.isClipboardRestorationApplicable(false)).toBe(false);
      expect(session.isClipboardRestorationApplicable(true)).toBe(false);
    });

    it('returns true when paste succeeded regardless of getUserInstruction', () => {
      const session = createSession();
      const dest = createMockSingletonComposablePasteDestination({
        id: 'terminal',
        displayName: 'Terminal',
        getUserInstruction: jest.fn().mockReturnValue('Paste (Cmd+V)'),
      });
      session.set(dest);

      expect(session.isClipboardRestorationApplicable(true)).toBe(true);
    });

    it('returns true when paste failed and destination has no failure instruction', () => {
      const session = createSession();
      const dest = createMockSingletonComposablePasteDestination({
        id: 'terminal',
        displayName: 'Terminal',
        getUserInstruction: jest
          .fn()
          .mockImplementation((result: AutoPasteResult) =>
            result === AutoPasteResult.Failure ? undefined : 'Press Cmd+V',
          ),
      });
      session.set(dest);

      expect(session.isClipboardRestorationApplicable(false)).toBe(true);
    });

    it('returns false when paste failed and destination provides a failure instruction', () => {
      const session = createSession();
      const dest = createMockSingletonComposablePasteDestination({
        id: 'terminal',
        displayName: 'Terminal',
        getUserInstruction: jest.fn().mockReturnValue('Paste (Cmd+V) to use.'),
      });
      session.set(dest);

      expect(session.isClipboardRestorationApplicable(false)).toBe(false);
    });
  });

  // ── subscribe ────────────────────────────────────────────────────

  describe('subscribe', () => {
    it('calls listener immediately with current state', () => {
      const session = createSession();
      const listener = jest.fn();

      session.subscribe(listener);

      expect(listener).toHaveBeenCalledWith(undefined);
    });

    it('calls listener immediately with bound info when destination is set', () => {
      const session = createSession();
      const dest = createMockSingletonComposablePasteDestination({
        id: 'terminal',
        displayName: 'Terminal',
      });
      session.set(dest);
      const listener = jest.fn();

      session.subscribe(listener);

      expect(listener).toHaveBeenCalledWith({ id: 'terminal', displayName: 'Terminal' });
    });

    it('returns a disposable that can be used to unsubscribe', () => {
      const session = createSession();
      const listener = jest.fn();

      const disposable = session.subscribe(listener);
      listener.mockClear();

      session.set(
        createMockSingletonComposablePasteDestination({ id: 'terminal', displayName: 'Terminal' }),
      );
      expect(listener).toHaveBeenCalledTimes(1);

      disposable.dispose();
    });
  });

  // ── dispose ──────────────────────────────────────────────────────

  describe('dispose', () => {
    it('disposes session-lifetime listener subscriptions', () => {
      const terminalDispose = jest.fn();
      const documentDispose = jest.fn();
      mockEvents.onDidCloseTerminal.mockReturnValue({ dispose: terminalDispose });
      mockEvents.onDidCloseTextDocument.mockReturnValue({ dispose: documentDispose });

      const session = createSession();
      session.dispose();

      expect(terminalDispose).toHaveBeenCalledTimes(1);
      expect(documentDispose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Terminal close auto-unbind ────────────────────────────────────

  describe('terminal close lifecycle', () => {
    it('unbinds when the bound terminal is closed', () => {
      const terminal = { name: 'bash' } as vscode.Terminal;
      const dest = createMockTerminalComposablePasteDestination({
        displayName: 'Terminal ("bash")',
        terminal,
      });
      const session = createSession();
      session.set(dest);

      const handler = mockEvents.onDidCloseTerminal.mock.calls[0][0];
      handler(terminal);

      expect(session.isSet()).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'BoundSession.setupTerminalCloseListener', terminalName: 'bash' },
        'Bound terminal closed: bash - auto-unbinding',
      );
      expect(mockFeedback.notifyAutoUnbind).toHaveBeenCalledWith(
        'Terminal ("bash")',
        'terminal-closed',
      );
    });

    it('does not unbind when a different terminal closes', () => {
      const dest = createMockTerminalComposablePasteDestination({
        displayName: 'Terminal ("bash")',
        terminal: { name: 'bash' } as vscode.Terminal,
      });
      const session = createSession();
      session.set(dest);

      const handler = mockEvents.onDidCloseTerminal.mock.calls[0][0];
      handler({ name: 'zsh' } as vscode.Terminal);

      expect(session.isSet()).toBe(true);
      expect(mockFeedback.notifyAutoUnbind).not.toHaveBeenCalled();
    });

    it('does not unbind when bound destination is not a terminal', () => {
      const dest = createMockSingletonComposablePasteDestination({
        id: 'cursor-ai',
        displayName: 'Cursor AI',
      });
      const session = createSession();
      session.set(dest);

      const handler = mockEvents.onDidCloseTerminal.mock.calls[0][0];
      handler({ name: 'bash' } as vscode.Terminal);

      expect(session.isSet()).toBe(true);
      expect(mockFeedback.notifyAutoUnbind).not.toHaveBeenCalled();
    });

    it('does not unbind when nothing is bound', () => {
      createSession();

      const handler = mockEvents.onDidCloseTerminal.mock.calls[0][0];
      handler({ name: 'bash' } as vscode.Terminal);

      expect(mockFeedback.notifyAutoUnbind).not.toHaveBeenCalled();
    });

    it('uses default name when terminal name is missing', () => {
      const terminal = { name: undefined } as unknown as vscode.Terminal;
      const dest = createMockTerminalComposablePasteDestination({
        displayName: 'Terminal ("bash")',
        terminal,
      });
      const session = createSession();
      session.set(dest);

      const handler = mockEvents.onDidCloseTerminal.mock.calls[0][0];
      handler(terminal);

      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'BoundSession.setupTerminalCloseListener', terminalName: 'Unnamed Terminal' },
        'Bound terminal closed: Unnamed Terminal - auto-unbinding',
      );
    });
  });

  // ── Document close auto-unbind ────────────────────────────────────

  describe('document close lifecycle', () => {
    it('unbinds when the bound document is closed with isClosed=true', () => {
      const uri = createMockUri('/test.ts');
      const dest = createMockEditorComposablePasteDestination({
        displayName: 'Text Editor ("test.ts")',
        uri,
        viewColumn: 1,
      });
      const session = createSession();
      session.set(dest);

      const handler = mockEvents.onDidCloseTextDocument.mock.calls[0][0];
      handler({ uri, isClosed: true } as vscode.TextDocument);

      expect(session.isSet()).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'BoundSession.setupDocumentCloseListener',
          editorDisplayName: 'Text Editor ("test.ts")',
          boundDocumentUri: 'file:///test.ts',
          isClosed: true,
        },
        'Bound document closed (isClosed=true): Text Editor ("test.ts") — auto-unbinding',
      );
      expect(mockFeedback.notifyAutoUnbind).toHaveBeenCalledWith(
        'Text Editor ("test.ts")',
        'editor-closed',
      );
    });

    it('falls back to Unknown in log when editor displayName is empty', () => {
      const uri = createMockUri('/test.ts');
      const dest = createMockEditorComposablePasteDestination({
        displayName: '',
        uri,
        viewColumn: 1,
      });
      const session = createSession();
      session.set(dest);

      const handler = mockEvents.onDidCloseTextDocument.mock.calls[0][0];
      handler({ uri, isClosed: true } as vscode.TextDocument);

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'BoundSession.setupDocumentCloseListener',
          editorDisplayName: 'Unknown',
          boundDocumentUri: 'file:///test.ts',
          isClosed: true,
        },
        'Bound document closed (isClosed=true): Unknown — auto-unbinding',
      );
    });

    it('keeps binding when isClosed=false', () => {
      const uri = createMockUri('/test.ts');
      const dest = createMockEditorComposablePasteDestination({
        displayName: 'Text Editor ("test.ts")',
        uri,
        viewColumn: 1,
      });
      const session = createSession();
      session.set(dest);

      const handler = mockEvents.onDidCloseTextDocument.mock.calls[0][0];
      handler({ uri, isClosed: false } as vscode.TextDocument);

      expect(session.isSet()).toBe(true);
      expect(mockFeedback.notifyAutoUnbind).not.toHaveBeenCalled();
    });

    it('does not unbind when a different document closes', () => {
      const dest = createMockEditorComposablePasteDestination({
        displayName: 'Text Editor ("test.ts")',
        uri: createMockUri('/test.ts'),
        viewColumn: 1,
      });
      const session = createSession();
      session.set(dest);

      const handler = mockEvents.onDidCloseTextDocument.mock.calls[0][0];
      handler({ uri: createMockUri('/other.ts'), isClosed: true } as vscode.TextDocument);

      expect(session.isSet()).toBe(true);
      expect(mockFeedback.notifyAutoUnbind).not.toHaveBeenCalled();
    });

    it('does not unbind when bound destination is not an editor', () => {
      const dest = createMockSingletonComposablePasteDestination({
        id: 'cursor-ai',
        displayName: 'Cursor AI',
      });
      const session = createSession();
      session.set(dest);

      const handler = mockEvents.onDidCloseTextDocument.mock.calls[0][0];
      handler({ uri: createMockUri('/test.ts'), isClosed: true } as vscode.TextDocument);

      expect(session.isSet()).toBe(true);
      expect(mockFeedback.notifyAutoUnbind).not.toHaveBeenCalled();
    });
  });
});
