import { createMockLogger } from 'barebone-logger-testing';

import {
  type CreateOptions,
  type DestinationBuilder,
  type DestinationBuilderContext,
  DestinationRegistry,
} from '../../destinations';
import {
  createBaseMockPasteDestination,
  createMockEligibilityCheckerFactory,
  createMockFocusCapabilityFactory,
  createMockVscodeAdapter,
} from '../helpers';

describe('DestinationRegistry', () => {
  const mockLogger = createMockLogger();
  const mockAdapter = createMockVscodeAdapter();

  const createMockFactories = () => ({
    focusCapability: createMockFocusCapabilityFactory(),
    eligibilityChecker: createMockEligibilityCheckerFactory(),
  });

  const createRegistry = (factories = createMockFactories()) =>
    new DestinationRegistry(
      factories.focusCapability,
      factories.eligibilityChecker,
      mockAdapter,
      mockLogger,
    );

  describe('register()', () => {
    it('should store builder in map when registered', () => {
      const registry = createRegistry();
      const builder = jest.fn();

      registry.register('terminal', builder);

      expect(registry.getSupportedKinds()).toStrictEqual(['terminal']);
    });

    it('should allow registering multiple destination kinds', () => {
      const registry = createRegistry();

      registry.register('terminal', jest.fn());
      registry.register('cursor-ai', jest.fn());
      registry.register('text-editor', jest.fn());

      expect(registry.getSupportedKinds()).toStrictEqual(['terminal', 'cursor-ai', 'text-editor']);
    });

    it('should overwrite previous builder when registering same kind', () => {
      const registry = createRegistry();
      const firstBuilder = jest.fn();
      const secondBuilder = jest
        .fn()
        .mockReturnValue(createBaseMockPasteDestination({ id: 'terminal' }));

      registry.register('terminal', firstBuilder);
      registry.register('terminal', secondBuilder);
      registry.create({ kind: 'terminal', terminal: {} as never });

      expect(firstBuilder).not.toHaveBeenCalled();
      expect(secondBuilder).toHaveBeenCalledTimes(1);
    });
  });

  describe('create()', () => {
    it('should execute builder when creating destination', () => {
      const registry = createRegistry();
      const mockDestination = createBaseMockPasteDestination({ id: 'terminal' });
      const builder = jest.fn().mockReturnValue(mockDestination);
      registry.register('terminal', builder);

      registry.create({ kind: 'terminal', terminal: {} as never });

      expect(builder).toHaveBeenCalledTimes(1);
    });

    it('should pass options and context to builder', () => {
      const factories = createMockFactories();
      const registry = createRegistry(factories);
      const mockDestination = createBaseMockPasteDestination({ id: 'terminal' });
      const builder = jest.fn().mockReturnValue(mockDestination);
      registry.register('terminal', builder);
      const options: CreateOptions = { kind: 'terminal', terminal: { name: 'Test' } as never };

      registry.create(options);

      expect(builder).toHaveBeenCalledTimes(1);
      expect(builder).toHaveBeenCalledWith(options, {
        factories: {
          focusCapability: factories.focusCapability,
          eligibilityChecker: factories.eligibilityChecker,
        },
        ideAdapter: mockAdapter,
        logger: mockLogger,
      });
    });

    it('should pass context with factories to builder (reference equality)', () => {
      const factories = createMockFactories();
      const registry = createRegistry(factories);
      const mockDestination = createBaseMockPasteDestination({ id: 'cursor-ai' });

      let capturedContext: DestinationBuilderContext | undefined;
      const builder = jest.fn().mockImplementation((_opts, ctx) => {
        capturedContext = ctx;
        return mockDestination;
      });
      registry.register('cursor-ai', builder);

      registry.create({ kind: 'cursor-ai' });

      expect(builder).toHaveBeenCalledTimes(1);
      expect(capturedContext).toBeDefined();
      expect(capturedContext!.factories.focusCapability).toBe(factories.focusCapability);
      expect(capturedContext!.factories.eligibilityChecker).toBe(factories.eligibilityChecker);
    });

    it('should pass ideAdapter to builder context (reference equality)', () => {
      const registry = createRegistry();
      const mockDestination = createBaseMockPasteDestination({ id: 'text-editor' });

      let capturedContext: DestinationBuilderContext | undefined;
      const builder = jest.fn().mockImplementation((_opts, ctx) => {
        capturedContext = ctx;
        return mockDestination;
      });
      registry.register('text-editor', builder);

      registry.create({ kind: 'text-editor', editor: {} as never });

      expect(builder).toHaveBeenCalledTimes(1);
      expect(capturedContext).toBeDefined();
      expect(capturedContext!.ideAdapter).toBe(mockAdapter);
    });

    it('should pass logger to builder context (reference equality)', () => {
      const registry = createRegistry();
      const mockDestination = createBaseMockPasteDestination({ id: 'claude-code' });

      let capturedContext: DestinationBuilderContext | undefined;
      const builder = jest.fn().mockImplementation((_opts, ctx) => {
        capturedContext = ctx;
        return mockDestination;
      });
      registry.register('claude-code', builder);

      registry.create({ kind: 'claude-code' });

      expect(builder).toHaveBeenCalledTimes(1);
      expect(capturedContext).toBeDefined();
      expect(capturedContext!.logger).toBe(mockLogger);
    });

    it('should return destination from builder', () => {
      const registry = createRegistry();
      const mockDestination = createBaseMockPasteDestination({ id: 'terminal' });
      const builder = jest.fn().mockReturnValue(mockDestination);
      registry.register('terminal', builder);

      const result = registry.create({ kind: 'terminal', terminal: {} as never });

      expect(result).toBe(mockDestination);
    });

    it('should throw DESTINATION_NOT_IMPLEMENTED for unregistered kind', () => {
      const registry = createRegistry();

      expect(() =>
        registry.create({ kind: 'terminal', terminal: {} as never }),
      ).toThrowRangeLinkExtensionError('DESTINATION_NOT_IMPLEMENTED', {
        message: 'No builder registered for destination kind: terminal',
        functionName: 'DestinationRegistry.create',
        details: { kind: 'terminal' },
      });
    });

    it('should include destination kind in error message', () => {
      const registry = createRegistry();

      expect(() => registry.create({ kind: 'github-copilot-chat' })).toThrowRangeLinkExtensionError(
        'DESTINATION_NOT_IMPLEMENTED',
        {
          message: 'No builder registered for destination kind: github-copilot-chat',
          functionName: 'DestinationRegistry.create',
          details: { kind: 'github-copilot-chat' },
        },
      );
    });
  });

  describe('getSupportedKinds()', () => {
    it('should return empty array initially', () => {
      const registry = createRegistry();

      expect(registry.getSupportedKinds()).toStrictEqual([]);
    });

    it('should return registered kinds', () => {
      const registry = createRegistry();
      registry.register('terminal', jest.fn());

      expect(registry.getSupportedKinds()).toStrictEqual(['terminal']);
    });

    it('should return multiple registered kinds in registration order', () => {
      const registry = createRegistry();
      registry.register('cursor-ai', jest.fn());
      registry.register('terminal', jest.fn());
      registry.register('text-editor', jest.fn());

      expect(registry.getSupportedKinds()).toStrictEqual(['cursor-ai', 'terminal', 'text-editor']);
    });
  });

  describe('factory injection', () => {
    it('should allow mocking FocusCapabilityFactory methods in builder', () => {
      const factories = createMockFactories();
      const mockCapability = { focus: jest.fn() };
      factories.focusCapability.createAIAssistantCapability.mockReturnValue(
        mockCapability as never,
      );
      const registry = createRegistry(factories);

      let capturedCapability: unknown;
      const builder: DestinationBuilder = (_options, context) => {
        capturedCapability = context.factories.focusCapability.createAIAssistantCapability(
          ['focus'],
          ['paste'],
        );
        return createBaseMockPasteDestination({ id: 'terminal' });
      };
      registry.register('terminal', builder);
      registry.create({ kind: 'terminal', terminal: {} as never });

      expect(capturedCapability).toBe(mockCapability);
      expect(factories.focusCapability.createAIAssistantCapability).toHaveBeenCalledWith(
        ['focus'],
        ['paste'],
      );
    });

    it('should allow mocking EligibilityCheckerFactory methods in builder', () => {
      const factories = createMockFactories();
      const mockChecker = { isEligible: jest.fn() };
      factories.eligibilityChecker.createContentEligibilityChecker.mockReturnValue(
        mockChecker as never,
      );
      const registry = createRegistry(factories);

      let capturedChecker: unknown;
      const builder: DestinationBuilder = (_options, context) => {
        capturedChecker = context.factories.eligibilityChecker.createContentEligibilityChecker();
        return createBaseMockPasteDestination({ id: 'cursor-ai' });
      };
      registry.register('cursor-ai', builder);
      registry.create({ kind: 'cursor-ai' });

      expect(capturedChecker).toBe(mockChecker);
      expect(factories.eligibilityChecker.createContentEligibilityChecker).toHaveBeenCalledTimes(1);
    });

    it('should provide same context to all builder invocations', () => {
      const registry = createRegistry();
      const contexts: DestinationBuilderContext[] = [];

      const terminalBuilder: DestinationBuilder = (_options, context) => {
        contexts.push(context);
        return createBaseMockPasteDestination({ id: 'terminal' });
      };
      const cursorBuilder: DestinationBuilder = (_options, context) => {
        contexts.push(context);
        return createBaseMockPasteDestination({ id: 'cursor-ai' });
      };

      registry.register('terminal', terminalBuilder);
      registry.register('cursor-ai', cursorBuilder);
      registry.create({ kind: 'terminal', terminal: {} as never });
      registry.create({ kind: 'cursor-ai' });

      expect(contexts).toHaveLength(2);
      expect(contexts[0]).toBe(contexts[1]);
    });
  });

  describe('getDisplayNames()', () => {
    it('should return display names for all destination kinds', () => {
      const registry = createRegistry();

      const displayNames = registry.getDisplayNames();

      expect(displayNames).toStrictEqual({
        terminal: 'Terminal',
        'text-editor': 'Text Editor',
        'cursor-ai': 'Cursor AI Assistant',
        'github-copilot-chat': 'GitHub Copilot Chat',
        'claude-code': 'Claude Code Chat',
      });
    });
  });

  describe('real-world usage pattern', () => {
    it('should support building ComposablePasteDestination with injected capabilities', () => {
      const factories = createMockFactories();
      const mockCapability = { focus: jest.fn() };
      const mockChecker = { isEligible: jest.fn() };

      factories.focusCapability.createAIAssistantCapability.mockReturnValue(
        mockCapability as never,
      );
      factories.eligibilityChecker.createContentEligibilityChecker.mockReturnValue(
        mockChecker as never,
      );

      const registry = createRegistry(factories);

      const builder: DestinationBuilder = (_options, context) => {
        const capability = context.factories.focusCapability.createAIAssistantCapability(
          ['focus.cmd'],
          ['paste'],
        );
        const checker = context.factories.eligibilityChecker.createContentEligibilityChecker();

        expect(capability).toBe(mockCapability);
        expect(checker).toBe(mockChecker);

        return createBaseMockPasteDestination({ id: 'cursor-ai' });
      };

      registry.register('cursor-ai', builder);
      const destination = registry.create({ kind: 'cursor-ai' });

      expect(destination).toBeDefined();
      expect(factories.focusCapability.createAIAssistantCapability).toHaveBeenCalledWith(
        ['focus.cmd'],
        ['paste'],
      );
      expect(factories.eligibilityChecker.createContentEligibilityChecker).toHaveBeenCalledTimes(1);
    });
  });
});
