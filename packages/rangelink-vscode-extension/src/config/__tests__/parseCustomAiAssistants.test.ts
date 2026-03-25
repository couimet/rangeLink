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

  it('parses valid custom AI assistant entry', () => {
    const configReader = createMockConfigReader({
      get: jest.fn().mockReturnValue([
        {
          extensionId: 'acme.spark-ai',
          extensionName: 'Spark AI',
          focusCommands: ['sparkAi.focus', 'sparkAi.sidebar.open'],
        },
      ]),
    });

    const result = parseCustomAiAssistants(configReader, mockLogger);

    expect(result).toStrictEqual([
      {
        kind: 'custom-ai:acme.spark-ai',
        extensionId: 'acme.spark-ai',
        extensionName: 'Spark AI',
        focusCommands: ['sparkAi.focus', 'sparkAi.sidebar.open'],
      },
    ]);
    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'parseCustomAiAssistants', count: 1, ids: ['acme.spark-ai'] },
      'Loaded 1 custom AI assistant(s)',
    );
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

  it('skips entry with missing extensionId and logs warning', () => {
    const configReader = createMockConfigReader({
      get: jest.fn().mockReturnValue([
        { extensionName: 'Missing ID', focusCommands: ['cmd.focus'] },
      ]),
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
      get: jest.fn().mockReturnValue([
        { extensionId: 'some.ext', focusCommands: ['cmd.focus'] },
      ]),
    });

    const result = parseCustomAiAssistants(configReader, mockLogger);

    expect(result).toStrictEqual([]);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { fn: 'parseCustomAiAssistants', index: 0, extensionName: undefined },
      'Skipping customAiAssistants[0]: extensionName must be a non-empty string',
    );
  });

  it('skips entry with empty focusCommands and logs warning', () => {
    const configReader = createMockConfigReader({
      get: jest.fn().mockReturnValue([
        { extensionId: 'some.ext', extensionName: 'Some', focusCommands: [] },
      ]),
    });

    const result = parseCustomAiAssistants(configReader, mockLogger);

    expect(result).toStrictEqual([]);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { fn: 'parseCustomAiAssistants', index: 0, focusCommands: [] },
      'Skipping customAiAssistants[0]: focusCommands must be a non-empty array of strings',
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
});
