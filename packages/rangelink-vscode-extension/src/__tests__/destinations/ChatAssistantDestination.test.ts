import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import type { FormattedLink } from 'rangelink-core-ts';

import { ChatAssistantDestination } from '../../destinations/ChatAssistantDestination';
import type { ChatPasteHelperFactory } from '../../destinations/ChatPasteHelperFactory';
import type { DestinationType } from '../../destinations/PasteDestination';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import { AutoPasteResult } from '../../types/AutoPasteResult';
import { createMockChatPasteHelperFactory } from '../helpers/createMockChatPasteHelperFactory';
import { createMockVscodeAdapter } from '../helpers/mockVSCode';

/**
 * Concrete test implementation of ChatAssistantDestination.
 * Provides minimal implementation of abstract methods for testing base class behavior.
 */
class TestChatAssistantDestination extends ChatAssistantDestination {
  readonly id: DestinationType = 'claude-code';
  readonly displayName = 'Test Chat Assistant';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  protected getFocusCommands(): string[] {
    return ['test.command'];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUserInstruction(_autoPasteResult: AutoPasteResult): string | undefined {
    return undefined;
  }

  getJumpSuccessMessage(): string {
    return 'Test success';
  }
}

describe('ChatAssistantDestination', () => {
  let destination: TestChatAssistantDestination;
  let mockLogger: Logger;
  let mockAdapter: VscodeAdapter;
  let mockChatPasteHelperFactory: ChatPasteHelperFactory;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockChatPasteHelperFactory = createMockChatPasteHelperFactory();

    mockAdapter = createMockVscodeAdapter();
    destination = new TestChatAssistantDestination(
      mockAdapter,
      mockChatPasteHelperFactory,
      mockLogger,
    );
  });

  describe('isEligibleForPasteLink()', () => {
    it('should always return true', async () => {
      const formattedLink = { link: 'src/file.ts#L10' } as FormattedLink;

      const result = await destination.isEligibleForPasteLink(formattedLink);

      expect(result).toBe(true);
    });

    it('should return true for for null value', async () => {
      const result = await destination.isEligibleForPasteLink(null as unknown as FormattedLink);

      expect(result).toBe(true);
    });

    it('should return true for for undefined value', async () => {
      const result = await destination.isEligibleForPasteLink(
        undefined as unknown as FormattedLink,
      );

      expect(result).toBe(true);
    });
  });

  describe('isEligibleForPasteContent()', () => {
    it('should always return true', async () => {
      const content = 'selected text content';

      const result = await destination.isEligibleForPasteContent(content);

      expect(result).toBe(true);
    });

    it('should return true for for null value', async () => {
      const result = await destination.isEligibleForPasteContent(null as unknown as string);

      expect(result).toBe(true);
    });

    it('should return true for for undefined value', async () => {
      const result = await destination.isEligibleForPasteContent(undefined as unknown as string);

      expect(result).toBe(true);
    });
  });
});
