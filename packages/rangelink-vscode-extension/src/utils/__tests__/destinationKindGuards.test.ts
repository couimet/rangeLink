import {
  isEditorDestination,
  isPasteDestinationKind,
  isSingletonDestination,
  isTerminalDestination,
} from '..';
import {
  createBaseMockPasteDestination,
  createMockCursorAIComposableDestination,
  createMockEditorComposablePasteDestination,
  createMockTerminalComposablePasteDestination,
} from '../../__tests__/helpers';

describe('destinationKindGuards', () => {
  describe('isPasteDestinationKind', () => {
    it('should return false for undefined destination', () => {
      const result = isPasteDestinationKind(undefined, 'terminal');
      expect(result).toBe(false);
    });

    it('should return false when destination.id does not match kind', () => {
      const destination = createMockTerminalComposablePasteDestination();
      const result = isPasteDestinationKind(destination, 'text-editor');
      expect(result).toBe(false);
    });

    it('should return true when destination.id matches kind', () => {
      const destination = createMockTerminalComposablePasteDestination();
      const result = isPasteDestinationKind(destination, 'terminal');
      expect(result).toBe(true);
    });

    it('should work with all destination kinds', () => {
      const terminalDest = createMockTerminalComposablePasteDestination();
      const editorDest = createMockEditorComposablePasteDestination();
      const singletonDest = createMockCursorAIComposableDestination();

      expect(isPasteDestinationKind(terminalDest, 'terminal')).toBe(true);
      expect(isPasteDestinationKind(editorDest, 'text-editor')).toBe(true);
      expect(isPasteDestinationKind(singletonDest, 'cursor-ai')).toBe(true);
    });
  });

  describe('isTerminalDestination', () => {
    it('should return false for undefined destination', () => {
      const result = isTerminalDestination(undefined);
      expect(result).toBe(false);
    });

    it('should return false for non-ComposablePasteDestination', () => {
      const destination = createBaseMockPasteDestination({ id: 'terminal' });
      const result = isTerminalDestination(destination);
      expect(result).toBe(false);
    });

    it('should return false for ComposablePasteDestination with non-terminal resource', () => {
      const editorDest = createMockEditorComposablePasteDestination();
      const result = isTerminalDestination(editorDest);
      expect(result).toBe(false);
    });

    it('should return true for ComposablePasteDestination with terminal resource', () => {
      const terminalDest = createMockTerminalComposablePasteDestination();
      const result = isTerminalDestination(terminalDest);
      expect(result).toBe(true);
    });

    it('should narrow type correctly to access terminal property', () => {
      const dest = createMockTerminalComposablePasteDestination();
      if (isTerminalDestination(dest)) {
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
      const destination = createBaseMockPasteDestination({ id: 'text-editor' });
      const result = isEditorDestination(destination);
      expect(result).toBe(false);
    });

    it('should return false for ComposablePasteDestination with non-editor resource', () => {
      const terminalDest = createMockTerminalComposablePasteDestination();
      const result = isEditorDestination(terminalDest);
      expect(result).toBe(false);
    });

    it('should return true for ComposablePasteDestination with editor resource', () => {
      const editorDest = createMockEditorComposablePasteDestination();
      const result = isEditorDestination(editorDest);
      expect(result).toBe(true);
    });

    it('should narrow type correctly to access editor property', () => {
      const dest = createMockEditorComposablePasteDestination();
      if (isEditorDestination(dest)) {
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
      const destination = createBaseMockPasteDestination({ id: 'cursor-ai' });
      const result = isSingletonDestination(destination);
      expect(result).toBe(false);
    });

    it('should return false for ComposablePasteDestination with non-singleton resource', () => {
      const terminalDest = createMockTerminalComposablePasteDestination();
      const result = isSingletonDestination(terminalDest);
      expect(result).toBe(false);
    });

    it('should return true for ComposablePasteDestination with singleton resource', () => {
      const singletonDest = createMockCursorAIComposableDestination();
      const result = isSingletonDestination(singletonDest);
      expect(result).toBe(true);
    });

    it('should narrow type correctly to access singleton resource', () => {
      const dest = createMockCursorAIComposableDestination();
      if (isSingletonDestination(dest)) {
        expect(dest.resource.kind).toBe('singleton');
      }
    });
  });
});
