import { createMockLogger } from 'barebone-logger-testing';

import { ComposablePasteDestination } from '../../destinations/ComposablePasteDestination';
import type { PasteDestination } from '../../destinations/PasteDestination';
import {
  isEditorDestination,
  isPasteDestinationType,
  isSingletonDestination,
  isTerminalDestination,
} from '..';
import { createMockEditor } from '../../__tests__/helpers/createMockEditor';
import { createMockTerminal } from '../../__tests__/helpers/createMockTerminal';

const createMockTextInserter = () => ({
  insert: jest.fn().mockResolvedValue(true),
});

const createMockEligibilityChecker = () => ({
  isEligible: jest.fn().mockResolvedValue(true),
});

const createMockFocusManager = () => ({
  focus: jest.fn().mockResolvedValue(undefined),
});

// Helper to create a real ComposablePasteDestination for testing
const createTerminalDestination = (): ComposablePasteDestination => {
  return ComposablePasteDestination.createTerminal({
    terminal: createMockTerminal(),
    displayName: 'Test Terminal',
    textInserter: createMockTextInserter() as any,
    focusManager: createMockFocusManager() as any,
    jumpSuccessMessage: 'Focused terminal',
    loggingDetails: {},
    logger: createMockLogger(),
    compareWith: jest.fn().mockResolvedValue(false),
  });
};

const createEditorDestination = (): ComposablePasteDestination => {
  return ComposablePasteDestination.createEditor({
    editor: createMockEditor(),
    displayName: 'Test Editor',
    textInserter: createMockTextInserter() as any,
    eligibilityChecker: createMockEligibilityChecker() as any,
    focusManager: createMockFocusManager() as any,
    jumpSuccessMessage: 'Focused editor',
    loggingDetails: {},
    logger: createMockLogger(),
    compareWith: jest.fn().mockResolvedValue(false),
  });
};

const createSingletonDestination = (): ComposablePasteDestination => {
  return ComposablePasteDestination.createAiAssistant({
    id: 'cursor-ai',
    displayName: 'Test AI Assistant',
    textInserter: createMockTextInserter() as any,
    focusManager: createMockFocusManager() as any,
    isAvailable: async () => true,
    jumpSuccessMessage: 'Focused AI',
    loggingDetails: {},
    logger: createMockLogger(),
    getUserInstruction: () => 'Use Cmd+V',
  });
};

// Create a non-ComposablePasteDestination mock for testing instanceof checks
const createNonComposableDestination = (): PasteDestination =>
  ({
    id: 'terminal',
    displayName: 'Mock Terminal',
    isAvailable: jest.fn().mockResolvedValue(true),
    isEligibleForPasteLink: jest.fn().mockResolvedValue(true),
    isEligibleForPasteContent: jest.fn().mockResolvedValue(true),
    pasteLink: jest.fn().mockResolvedValue(true),
    pasteContent: jest.fn().mockResolvedValue(true),
    focus: jest.fn().mockResolvedValue(true),
    getUserInstruction: jest.fn().mockReturnValue(undefined),
    getJumpSuccessMessage: jest.fn().mockReturnValue('Success'),
    getLoggingDetails: jest.fn().mockReturnValue({}),
    equals: jest.fn().mockResolvedValue(false),
  }) as unknown as PasteDestination;

describe('destinationTypeGuards', () => {
  describe('isPasteDestinationType', () => {
    it('should return false for undefined destination', () => {
      const result = isPasteDestinationType(undefined, 'terminal');
      expect(result).toBe(false);
    });

    it('should return false when destination.id does not match type', () => {
      const destination = createTerminalDestination();
      const result = isPasteDestinationType(destination, 'text-editor');
      expect(result).toBe(false);
    });

    it('should return true when destination.id matches type', () => {
      const destination = createTerminalDestination();
      const result = isPasteDestinationType(destination, 'terminal');
      expect(result).toBe(true);
    });

    it('should work with all destination types', () => {
      const terminalDest = createTerminalDestination();
      const editorDest = createEditorDestination();
      const singletonDest = createSingletonDestination();

      expect(isPasteDestinationType(terminalDest, 'terminal')).toBe(true);
      expect(isPasteDestinationType(editorDest, 'text-editor')).toBe(true);
      expect(isPasteDestinationType(singletonDest, 'cursor-ai')).toBe(true);
    });
  });

  describe('isTerminalDestination', () => {
    it('should return false for undefined destination', () => {
      const result = isTerminalDestination(undefined);
      expect(result).toBe(false);
    });

    it('should return false for non-ComposablePasteDestination', () => {
      const destination = createNonComposableDestination();
      const result = isTerminalDestination(destination);
      expect(result).toBe(false);
    });

    it('should return false for ComposablePasteDestination with non-terminal resource', () => {
      const editorDest = createEditorDestination();
      const result = isTerminalDestination(editorDest);
      expect(result).toBe(false);
    });

    it('should return true for ComposablePasteDestination with terminal resource', () => {
      const terminalDest = createTerminalDestination();
      const result = isTerminalDestination(terminalDest);
      expect(result).toBe(true);
    });

    it('should narrow type correctly to access terminal property', () => {
      const dest = createTerminalDestination();
      if (isTerminalDestination(dest)) {
        // TypeScript should allow accessing terminal property
        expect(dest.resource.terminal).toBeDefined();
        expect(dest.resource.kind).toBe('terminal');
      }
    });
  });

  describe('isEditorDestination', () => {
    it('should return false for undefined destination', () => {
      const result = isEditorDestination(undefined);
      expect(result).toBe(false);
    });

    it('should return false for non-ComposablePasteDestination', () => {
      const destination = createNonComposableDestination();
      const result = isEditorDestination(destination);
      expect(result).toBe(false);
    });

    it('should return false for ComposablePasteDestination with non-editor resource', () => {
      const terminalDest = createTerminalDestination();
      const result = isEditorDestination(terminalDest);
      expect(result).toBe(false);
    });

    it('should return true for ComposablePasteDestination with editor resource', () => {
      const editorDest = createEditorDestination();
      const result = isEditorDestination(editorDest);
      expect(result).toBe(true);
    });

    it('should narrow type correctly to access editor property', () => {
      const dest = createEditorDestination();
      if (isEditorDestination(dest)) {
        // TypeScript should allow accessing editor property
        expect(dest.resource.editor).toBeDefined();
        expect(dest.resource.kind).toBe('editor');
      }
    });
  });

  describe('isSingletonDestination', () => {
    it('should return false for undefined destination', () => {
      const result = isSingletonDestination(undefined);
      expect(result).toBe(false);
    });

    it('should return false for non-ComposablePasteDestination', () => {
      const destination = createNonComposableDestination();
      const result = isSingletonDestination(destination);
      expect(result).toBe(false);
    });

    it('should return false for ComposablePasteDestination with non-singleton resource', () => {
      const terminalDest = createTerminalDestination();
      const result = isSingletonDestination(terminalDest);
      expect(result).toBe(false);
    });

    it('should return true for ComposablePasteDestination with singleton resource', () => {
      const singletonDest = createSingletonDestination();
      const result = isSingletonDestination(singletonDest);
      expect(result).toBe(true);
    });

    it('should narrow type correctly to access singleton resource', () => {
      const dest = createSingletonDestination();
      if (isSingletonDestination(dest)) {
        // TypeScript should know resource kind is 'singleton'
        expect(dest.resource.kind).toBe('singleton');
      }
    });
  });
});
