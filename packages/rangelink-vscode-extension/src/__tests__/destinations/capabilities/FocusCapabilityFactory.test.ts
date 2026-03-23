import { createMockLogger } from 'barebone-logger-testing';

import { AIAssistantFocusCapability } from '../../../destinations/capabilities/AIAssistantFocusCapability';
import { EditorFocusCapability } from '../../../destinations/capabilities/EditorFocusCapability';
import { FocusCapabilityFactory } from '../../../destinations/capabilities/FocusCapabilityFactory';
import { TerminalFocusCapability } from '../../../destinations/capabilities/TerminalFocusCapability';
import {
  createMockClipboardPreserver,
  createMockTerminal,
  createMockUri,
  createMockVscodeAdapter,
} from '../../helpers';

describe('FocusCapabilityFactory', () => {
  const mockLogger = createMockLogger();
  const mockAdapter = createMockVscodeAdapter();
  const mockClipboardPreserver = createMockClipboardPreserver();
  const factory = new FocusCapabilityFactory(mockAdapter, mockClipboardPreserver, mockLogger);

  it('creates EditorFocusCapability', () => {
    const uri = createMockUri('/workspace/src/file.ts');
    const capability = factory.createEditorCapability(uri, 1);

    expect(capability).toBeInstanceOf(EditorFocusCapability);
  });

  it('creates TerminalFocusCapability', () => {
    const terminal = createMockTerminal({ name: 'zsh' });
    const capability = factory.createTerminalCapability(terminal);

    expect(capability).toBeInstanceOf(TerminalFocusCapability);
  });

  it('creates AIAssistantFocusCapability', () => {
    const capability = factory.createAIAssistantCapability(
      ['workbench.action.chat.open'],
      ['editor.action.clipboardPasteAction'],
    );

    expect(capability).toBeInstanceOf(AIAssistantFocusCapability);
  });
});
