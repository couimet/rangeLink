import { createMockLogger } from 'barebone-logger-testing';

import {
  DestinationRegistry,
  type CreateOptions,
  type DestinationBuilder,
  type DestinationBuilderContext,
} from '../../destinations/DestinationRegistry';
import {
  createMockEligibilityCheckerFactory,
  createMockFocusManagerFactory,
  createMockPasteDestination,
  createMockTextInserterFactory,
  createMockVscodeAdapter,
} from '../helpers';

describe('DestinationRegistry', () => {
  const mockLogger = createMockLogger();
  const mockAdapter = createMockVscodeAdapter();

  const createMockFactories = () => ({
    textInserter: createMockTextInserterFactory(),
    eligibilityChecker: createMockEligibilityCheckerFactory(),
    focusManager: createMockFocusManagerFactory(),
  });

  const createRegistry = (factories = createMockFactories()) =>
    new DestinationRegistry(
      factories.textInserter,
      factories.eligibilityChecker,
      factories.focusManager,
      mockAdapter,
      mockLogger,
    );

  describe('register()', () => {
    it('should store builder in map when registered', () => {
      const registry = createRegistry();
      const builder = jest.fn();

      registry.register('terminal', builder);

      expect(registry.getSupportedTypes()).toStrictEqual(['terminal']);
    });

    it('should allow registering multiple destination types', () => {
      const registry = createRegistry();

      registry.register('terminal', jest.fn());
      registry.register('cursor-ai', jest.fn());
      registry.register('text-editor', jest.fn());

      expect(registry.getSupportedTypes()).toStrictEqual(['terminal', 'cursor-ai', 'text-editor']);
    });

    it('should overwrite previous builder when registering same type', () => {
      const registry = createRegistry();
      const firstBuilder = jest.fn();
      const secondBuilder = jest.fn().mockReturnValue(createMockPasteDestination());

      registry.register('terminal', firstBuilder);
      registry.register('terminal', secondBuilder);
      registry.create({ type: 'terminal', terminal: {} as never });

      expect(firstBuilder).not.toHaveBeenCalled();
      expect(secondBuilder).toHaveBeenCalledTimes(1);
    });
  });

  describe('create()', () => {
    it('should execute builder when creating destination', () => {
      const registry = createRegistry();
      const mockDestination = createMockPasteDestination();
      const builder = jest.fn().mockReturnValue(mockDestination);
      registry.register('terminal', builder);

      registry.create({ type: 'terminal', terminal: {} as never });

      expect(builder).toHaveBeenCalledTimes(1);
    });

    it('should pass options and context to builder', () => {
      const factories = createMockFactories();
      const registry = createRegistry(factories);
      const mockDestination = createMockPasteDestination();
      const builder = jest.fn().mockReturnValue(mockDestination);
      registry.register('terminal', builder);
      const options: CreateOptions = { type: 'terminal', terminal: { name: 'Test' } as never };

      registry.create(options);

      expect(builder).toHaveBeenCalledTimes(1);
      expect(builder).toHaveBeenCalledWith(options, {
        factories: {
          textInserter: factories.textInserter,
          eligibilityChecker: factories.eligibilityChecker,
          focusManager: factories.focusManager,
        },
        ideAdapter: mockAdapter,
        logger: mockLogger,
      });
    });

    it('should pass context with factories to builder (reference equality)', () => {
      const factories = createMockFactories();
      const registry = createRegistry(factories);
      const mockDestination = createMockPasteDestination();

      // Capture context for reference equality assertions
      let capturedContext: DestinationBuilderContext | undefined;
      const builder = jest.fn().mockImplementation((_opts, ctx) => {
        capturedContext = ctx;
        return mockDestination;
      });
      registry.register('cursor-ai', builder);

      registry.create({ type: 'cursor-ai' });

      expect(builder).toHaveBeenCalledTimes(1);
      expect(capturedContext).toBeDefined();
      expect(capturedContext!.factories.textInserter).toBe(factories.textInserter);
      expect(capturedContext!.factories.eligibilityChecker).toBe(factories.eligibilityChecker);
      expect(capturedContext!.factories.focusManager).toBe(factories.focusManager);
    });

    it('should pass ideAdapter to builder context (reference equality)', () => {
      const registry = createRegistry();
      const mockDestination = createMockPasteDestination();

      let capturedContext: DestinationBuilderContext | undefined;
      const builder = jest.fn().mockImplementation((_opts, ctx) => {
        capturedContext = ctx;
        return mockDestination;
      });
      registry.register('text-editor', builder);

      registry.create({ type: 'text-editor', editor: {} as never });

      expect(builder).toHaveBeenCalledTimes(1);
      expect(capturedContext).toBeDefined();
      expect(capturedContext!.ideAdapter).toBe(mockAdapter);
    });

    it('should pass logger to builder context (reference equality)', () => {
      const registry = createRegistry();
      const mockDestination = createMockPasteDestination();

      let capturedContext: DestinationBuilderContext | undefined;
      const builder = jest.fn().mockImplementation((_opts, ctx) => {
        capturedContext = ctx;
        return mockDestination;
      });
      registry.register('claude-code', builder);

      registry.create({ type: 'claude-code' });

      expect(builder).toHaveBeenCalledTimes(1);
      expect(capturedContext).toBeDefined();
      expect(capturedContext!.logger).toBe(mockLogger);
    });

    it('should return destination from builder', () => {
      const registry = createRegistry();
      const mockDestination = createMockPasteDestination({ id: 'terminal' });
      const builder = jest.fn().mockReturnValue(mockDestination);
      registry.register('terminal', builder);

      const result = registry.create({ type: 'terminal', terminal: {} as never });

      expect(result).toBe(mockDestination);
    });

    it('should throw DESTINATION_NOT_IMPLEMENTED for unregistered type', () => {
      const registry = createRegistry();

      expect(() =>
        registry.create({ type: 'terminal', terminal: {} as never }),
      ).toThrowRangeLinkExtensionError('DESTINATION_NOT_IMPLEMENTED', {
        message: 'No builder registered for destination type: terminal',
        functionName: 'DestinationRegistry.create',
        details: { destinationType: 'terminal' },
      });
    });

    it('should include destination type in error message', () => {
      const registry = createRegistry();

      expect(() => registry.create({ type: 'github-copilot-chat' })).toThrowRangeLinkExtensionError(
        'DESTINATION_NOT_IMPLEMENTED',
        {
          message: 'No builder registered for destination type: github-copilot-chat',
          functionName: 'DestinationRegistry.create',
          details: { destinationType: 'github-copilot-chat' },
        },
      );
    });
  });

  describe('getSupportedTypes()', () => {
    it('should return empty array initially', () => {
      const registry = createRegistry();

      expect(registry.getSupportedTypes()).toStrictEqual([]);
    });

    it('should return registered types', () => {
      const registry = createRegistry();
      registry.register('terminal', jest.fn());

      expect(registry.getSupportedTypes()).toStrictEqual(['terminal']);
    });

    it('should return multiple registered types in registration order', () => {
      const registry = createRegistry();
      registry.register('cursor-ai', jest.fn());
      registry.register('terminal', jest.fn());
      registry.register('text-editor', jest.fn());

      expect(registry.getSupportedTypes()).toStrictEqual(['cursor-ai', 'terminal', 'text-editor']);
    });
  });

  describe('factory injection', () => {
    it('should allow mocking TextInserterFactory methods in builder', () => {
      const factories = createMockFactories();
      const mockInserter = { insert: jest.fn() };
      factories.textInserter.createClipboardInserter.mockReturnValue(mockInserter as never);
      const registry = createRegistry(factories);

      let capturedInserter: unknown;
      const builder: DestinationBuilder = (_options, context) => {
        capturedInserter = context.factories.textInserter.createClipboardInserter(['paste']);
        return createMockPasteDestination();
      };
      registry.register('terminal', builder);
      registry.create({ type: 'terminal', terminal: {} as never });

      expect(capturedInserter).toBe(mockInserter);
      expect(factories.textInserter.createClipboardInserter).toHaveBeenCalledWith(['paste']);
    });

    it('should allow mocking EligibilityCheckerFactory methods in builder', () => {
      const factories = createMockFactories();
      const mockChecker = { isEligible: jest.fn() };
      factories.eligibilityChecker.createAlwaysEligible.mockReturnValue(mockChecker as never);
      const registry = createRegistry(factories);

      let capturedChecker: unknown;
      const builder: DestinationBuilder = (_options, context) => {
        capturedChecker = context.factories.eligibilityChecker.createAlwaysEligible();
        return createMockPasteDestination();
      };
      registry.register('cursor-ai', builder);
      registry.create({ type: 'cursor-ai' });

      expect(capturedChecker).toBe(mockChecker);
      expect(factories.eligibilityChecker.createAlwaysEligible).toHaveBeenCalledTimes(1);
    });

    it('should allow mocking FocusManagerFactory methods in builder', () => {
      const factories = createMockFactories();
      const mockFocusManager = { focus: jest.fn() };
      factories.focusManager.createCommandFocus.mockReturnValue(mockFocusManager as never);
      const registry = createRegistry(factories);

      let capturedFocusManager: unknown;
      const builder: DestinationBuilder = (_options, context) => {
        capturedFocusManager = context.factories.focusManager.createCommandFocus(['cmd']);
        return createMockPasteDestination();
      };
      registry.register('text-editor', builder);
      registry.create({ type: 'text-editor', editor: {} as never });

      expect(capturedFocusManager).toBe(mockFocusManager);
      expect(factories.focusManager.createCommandFocus).toHaveBeenCalledWith(['cmd']);
    });

    it('should provide same context to all builder invocations', () => {
      const registry = createRegistry();
      const contexts: DestinationBuilderContext[] = [];

      const terminalBuilder: DestinationBuilder = (_options, context) => {
        contexts.push(context);
        return createMockPasteDestination();
      };
      const cursorBuilder: DestinationBuilder = (_options, context) => {
        contexts.push(context);
        return createMockPasteDestination();
      };

      registry.register('terminal', terminalBuilder);
      registry.register('cursor-ai', cursorBuilder);
      registry.create({ type: 'terminal', terminal: {} as never });
      registry.create({ type: 'cursor-ai' });

      expect(contexts).toHaveLength(2);
      expect(contexts[0]).toBe(contexts[1]);
    });
  });

  describe('real-world usage pattern', () => {
    it('should support building ComposablePasteDestination with injected capabilities', () => {
      const factories = createMockFactories();
      const mockInserter = { insert: jest.fn() };
      const mockChecker = { isEligible: jest.fn() };
      const mockFocus = { focus: jest.fn() };

      factories.textInserter.createClipboardInserter.mockReturnValue(mockInserter as never);
      factories.eligibilityChecker.createAlwaysEligible.mockReturnValue(mockChecker as never);
      factories.focusManager.createCommandFocus.mockReturnValue(mockFocus as never);

      const registry = createRegistry(factories);

      // Simulate how a real builder would use the factories
      const builder: DestinationBuilder = (_options, context) => {
        const inserter = context.factories.textInserter.createClipboardInserter(['paste']);
        const checker = context.factories.eligibilityChecker.createAlwaysEligible();
        const focus = context.factories.focusManager.createCommandFocus(['open.chat']);

        // In real implementation, these would be passed to ComposablePasteDestination
        // Here we just verify they were created correctly
        expect(inserter).toBe(mockInserter);
        expect(checker).toBe(mockChecker);
        expect(focus).toBe(mockFocus);

        return createMockPasteDestination();
      };

      registry.register('cursor-ai', builder);
      const destination = registry.create({ type: 'cursor-ai' });

      expect(destination).toBeDefined();
      expect(factories.textInserter.createClipboardInserter).toHaveBeenCalledWith(['paste']);
      expect(factories.eligibilityChecker.createAlwaysEligible).toHaveBeenCalledTimes(1);
      expect(factories.focusManager.createCommandFocus).toHaveBeenCalledWith(['open.chat']);
    });
  });
});
