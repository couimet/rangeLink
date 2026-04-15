import { createMockLogger } from 'barebone-logger-testing';

import { createMockConfigReader } from '../../__tests__/helpers';
import { parseCustomAiAssistants } from '../parseCustomAiAssistants';

describe('parseCustomAiAssistants', () => {
  const mockLogger = createMockLogger();

  it('returns empty array when setting is not configured', () => {
    const configReader = createMockConfigReader();

    const result = parseCustomAiAssistants(configReader, mockLogger);

    expect(result).toStrictEqual([]);
  });

  it('returns empty array when setting is an empty array', () => {
    const configReader = createMockConfigReader({ get: jest.fn().mockReturnValue([]) });

    const result = parseCustomAiAssistants(configReader, mockLogger);

    expect(result).toStrictEqual([]);
  });

  describe('focusCommands only (Tier 3)', () => {
    it('parses entry with only focusCommands', () => {
      const configReader = createMockConfigReader({
        get: jest.fn().mockReturnValue([
          {
            extensionId: 'acme.spark-ai',
            extensionName: 'Spark AI',
            focusCommands: ['sparkAi.chatView.focus'],
          },
        ]),
      });

      const result = parseCustomAiAssistants(configReader, mockLogger);

      expect(result).toStrictEqual([
        {
          kind: 'custom-ai:acme.spark-ai',
          extensionId: 'acme.spark-ai',
          extensionName: 'Spark AI',
          focusCommands: ['sparkAi.chatView.focus'],
        },
      ]);
    });
  });

  describe('focusAndPasteCommands only (Tier 2)', () => {
    it('parses entry with only focusAndPasteCommands', () => {
      const configReader = createMockConfigReader({
        get: jest.fn().mockReturnValue([
          {
            extensionId: 'acme.cool-ai',
            extensionName: 'Cool AI',
            focusAndPasteCommands: ['coolAi.openChat'],
          },
        ]),
      });

      const result = parseCustomAiAssistants(configReader, mockLogger);

      expect(result).toStrictEqual([
        {
          kind: 'custom-ai:acme.cool-ai',
          extensionId: 'acme.cool-ai',
          extensionName: 'Cool AI',
          focusAndPasteCommands: ['coolAi.openChat'],
        },
      ]);
    });
  });

  describe('insertCommands (Tier 1)', () => {
    it('normalizes plain string insertCommands to objects', () => {
      const configReader = createMockConfigReader({
        get: jest.fn().mockReturnValue([
          {
            extensionId: 'acme.spark-ai',
            extensionName: 'Spark AI',
            insertCommands: ['sparkAi.insertText'],
          },
        ]),
      });

      const result = parseCustomAiAssistants(configReader, mockLogger);

      expect(result).toStrictEqual([
        {
          kind: 'custom-ai:acme.spark-ai',
          extensionId: 'acme.spark-ai',
          extensionName: 'Spark AI',
          insertCommands: [{ command: 'sparkAi.insertText' }],
        },
      ]);
    });

    it('preserves object insertCommands with args template', () => {
      const configReader = createMockConfigReader({
        get: jest.fn().mockReturnValue([
          {
            extensionId: 'acme.fancy',
            extensionName: 'Fancy',
            insertCommands: [
              { command: 'fancy.insert', args: [{ text: '${content}', format: 'markdown' }] },
            ],
          },
        ]),
      });

      const result = parseCustomAiAssistants(configReader, mockLogger);

      expect(result).toStrictEqual([
        {
          kind: 'custom-ai:acme.fancy',
          extensionId: 'acme.fancy',
          extensionName: 'Fancy',
          insertCommands: [
            { command: 'fancy.insert', args: [{ text: '${content}', format: 'markdown' }] },
          ],
        },
      ]);
    });

    it('skips invalid insertCommand entries and keeps valid ones', () => {
      const configReader = createMockConfigReader({
        get: jest.fn().mockReturnValue([
          {
            extensionId: 'acme.mixed',
            extensionName: 'Mixed',
            insertCommands: ['valid.cmd', 42, { command: '' }, { command: 'also.valid' }],
          },
        ]),
      });

      const result = parseCustomAiAssistants(configReader, mockLogger);

      expect(result).toStrictEqual([
        {
          kind: 'custom-ai:acme.mixed',
          extensionId: 'acme.mixed',
          extensionName: 'Mixed',
          insertCommands: [{ command: 'valid.cmd' }, { command: 'also.valid' }],
        },
      ]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'parseCustomAiAssistants', index: 0, itemIndex: 1 },
        'Skipping customAiAssistants[0].insertCommands[1]: invalid entry',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'parseCustomAiAssistants', index: 0, itemIndex: 2 },
        'Skipping customAiAssistants[0].insertCommands[2]: invalid entry',
      );
    });
  });

  describe('all three tiers present', () => {
    it('parses entry with all three command tiers', () => {
      const configReader = createMockConfigReader({
        get: jest.fn().mockReturnValue([
          {
            extensionId: 'acme.full',
            extensionName: 'Full AI',
            insertCommands: ['full.insertText'],
            focusAndPasteCommands: ['full.openChat'],
            focusCommands: ['full.chatView.focus'],
          },
        ]),
      });

      const result = parseCustomAiAssistants(configReader, mockLogger);

      expect(result).toStrictEqual([
        {
          kind: 'custom-ai:acme.full',
          extensionId: 'acme.full',
          extensionName: 'Full AI',
          insertCommands: [{ command: 'full.insertText' }],
          focusAndPasteCommands: ['full.openChat'],
          focusCommands: ['full.chatView.focus'],
        },
      ]);
    });
  });

  describe('validation', () => {
    it('skips entry with no command tiers and logs warning', () => {
      const configReader = createMockConfigReader({
        get: jest.fn().mockReturnValue([
          {
            extensionId: 'acme.empty',
            extensionName: 'Empty',
          },
        ]),
      });

      const result = parseCustomAiAssistants(configReader, mockLogger);

      expect(result).toStrictEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'parseCustomAiAssistants', index: 0 },
        'Skipping customAiAssistants[0]: at least one of insertCommands, focusAndPasteCommands, or focusCommands must be a non-empty array',
      );
    });

    it('skips entry with all-invalid insertCommands and no other tiers', () => {
      const configReader = createMockConfigReader({
        get: jest.fn().mockReturnValue([
          {
            extensionId: 'acme.bad',
            extensionName: 'Bad',
            insertCommands: [42, null],
          },
        ]),
      });

      const result = parseCustomAiAssistants(configReader, mockLogger);

      expect(result).toStrictEqual([]);
    });

    it('skips entry with missing extensionId and logs warning', () => {
      const configReader = createMockConfigReader({
        get: jest
          .fn()
          .mockReturnValue([{ extensionName: 'Missing ID', focusCommands: ['cmd.focus'] }]),
      });

      const result = parseCustomAiAssistants(configReader, mockLogger);

      expect(result).toStrictEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'parseCustomAiAssistants', index: 0, extensionId: undefined },
        'Skipping customAiAssistants[0]: extensionId must be a non-empty string',
      );
    });

    it('skips entry with missing extensionName and logs warning', () => {
      const configReader = createMockConfigReader({
        get: jest.fn().mockReturnValue([{ extensionId: 'some.ext', focusCommands: ['cmd.focus'] }]),
      });

      const result = parseCustomAiAssistants(configReader, mockLogger);

      expect(result).toStrictEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'parseCustomAiAssistants', index: 0, extensionName: undefined },
        'Skipping customAiAssistants[0]: extensionName must be a non-empty string',
      );
    });

    it('skips duplicate extensionId and logs warning', () => {
      const configReader = createMockConfigReader({
        get: jest.fn().mockReturnValue([
          { extensionId: 'same.id', extensionName: 'First', focusCommands: ['a.focus'] },
          { extensionId: 'same.id', extensionName: 'Duplicate', focusCommands: ['b.focus'] },
        ]),
      });

      const result = parseCustomAiAssistants(configReader, mockLogger);

      expect(result).toHaveLength(1);
      expect(result[0].extensionName).toBe('First');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'parseCustomAiAssistants', index: 1, extensionId: 'same.id' },
        "Skipping customAiAssistants[1]: duplicate extensionId 'same.id'",
      );
    });

    it('skips non-object entries and logs warning', () => {
      const configReader = createMockConfigReader({
        get: jest.fn().mockReturnValue(['not-an-object', null, 42]),
      });

      const result = parseCustomAiAssistants(configReader, mockLogger);

      expect(result).toStrictEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledTimes(3);
    });

    it('skips invalid entries but keeps valid ones', () => {
      const configReader = createMockConfigReader({
        get: jest.fn().mockReturnValue([
          { extensionId: '', extensionName: 'Empty ID', focusCommands: ['cmd'] },
          { extensionId: 'valid.ext', extensionName: 'Valid', focusCommands: ['valid.focus'] },
        ]),
      });

      const result = parseCustomAiAssistants(configReader, mockLogger);

      expect(result).toHaveLength(1);
      expect(result[0].extensionId).toBe('valid.ext');
    });

    it('parses multiple valid entries preserving order', () => {
      const configReader = createMockConfigReader({
        get: jest.fn().mockReturnValue([
          { extensionId: 'tool-a.ext', extensionName: 'Tool A', focusCommands: ['a.focus'] },
          { extensionId: 'tool-b.ext', extensionName: 'Tool B', focusCommands: ['b.focus'] },
        ]),
      });

      const result = parseCustomAiAssistants(configReader, mockLogger);

      expect(result).toHaveLength(2);
      expect(result[0].extensionId).toBe('tool-a.ext');
      expect(result[1].extensionId).toBe('tool-b.ext');
    });

    it('logs loaded count with extension IDs', () => {
      const configReader = createMockConfigReader({
        get: jest
          .fn()
          .mockReturnValue([
            { extensionId: 'acme.ai', extensionName: 'Acme', focusCommands: ['acme.focus'] },
          ]),
      });

      parseCustomAiAssistants(configReader, mockLogger);

      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'parseCustomAiAssistants', count: 1, ids: ['acme.ai'] },
        'Loaded 1 custom AI assistant(s)',
      );
    });
  });
});
