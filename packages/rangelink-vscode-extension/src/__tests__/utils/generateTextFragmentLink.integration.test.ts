/**
 * Integration tests for text fragment link generation.
 *
 * These tests verify the full flow from a VSCode selection to the emitted link
 * WITHOUT mocking findOccurrences, normalizeEOL, or formatTextFragment. They
 * use a range-aware document double that maps line/character positions to
 * offsets in a real CRLF document, so the selected text is extracted exactly as
 * VS Code would return it.
 *
 * Purpose: Ensure the unit-test mocks accurately represent real
 * rangelink-core-ts behavior, in particular that CRLF documents emit `%0A`
 * (never `%0D`) inside the text directive and that generated links resolve back
 * to the selected text through parseTextFragment.
 */
import { generateTextFragmentLink, type GenerateTextFragmentLinkOptions } from '../../utils/generateTextFragmentLink';
import { createMockDocument, createMockPosition, createMockSelection } from '../helpers';

import { createMockLogger } from '@couimet/logger-contract-testing';
import { type ParsedTextFragment, parseTextFragment } from 'text-fragment-ts';
import * as vscode from 'vscode';

let mockLogger: ReturnType<typeof createMockLogger>;

const mockSelection = (startLine: number, startCharacter: number, endLine: number, endCharacter: number): vscode.Selection => {
  const start = createMockPosition({ line: startLine, character: startCharacter });
  const end = createMockPosition({ line: endLine, character: endCharacter });
  return createMockSelection({
    anchor: start,
    active: end,
    start,
    end,
    isReversed: false,
    isEmpty: false,
  });
};

// Build a document double whose getText(range?) honors line/character positions
// against a real content string with a configurable EOL, so selections spanning
// multiple lines include the line terminators exactly as VS Code reports them.
const createRangeAwareDocument = (content: string): vscode.TextDocument => {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(eol);
  const lineStarts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    lineStarts.push(offset);
    offset += line.length + eol.length;
  }
  const offsetAt = (position: vscode.Position): number => lineStarts[position.line] + position.character;

  return createMockDocument({
    getText: jest.fn((range?: vscode.Range): string => {
      if (!range) {
        return content;
      }
      const start = offsetAt(range.start);
      const end = offsetAt(range.end);
      return content.slice(Math.min(start, end), Math.max(start, end));
    }),
  });
};

const generateFromSelection = (content: string, selection: vscode.Selection, referencePath = 'src/file.ts'): ReturnType<typeof generateTextFragmentLink> => {
  const options: GenerateTextFragmentLinkOptions = {
    referencePath,
    document: createRangeAwareDocument(content),
    selections: [selection],
    logger: mockLogger,
  };
  return generateTextFragmentLink(options);
};

describe('text fragment generation integration', () => {
  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('extracts a single-line selection from a CRLF document and percent-encodes reserved characters', () => {
    const selection = mockSelection(1, 6, 1, 18); // 'answer = 42;'

    const result = generateFromSelection('alpha\r\nconst answer = 42;\r\nomega', selection);

    const expectedLink = 'src/file.ts:~:text=answer%20%3D%2042%3B';
    expect(result).toBeSuccessWith((link: string) => {
      expect(link).toBe(expectedLink);
    });
    expect(mockLogger.info).toHaveBeenCalledWith({ fn: 'generateTextFragmentLink', link: expectedLink }, `Generated text fragment link: ${expectedLink}`);

    const parsed = parseTextFragment(expectedLink);
    expect(parsed).toBeSuccessWith((parsedLink: ParsedTextFragment) => {
      expect({ path: parsedLink.path, directive: parsedLink.directive }).toStrictEqual({
        path: 'src/file.ts',
        directive: { start: 'answer = 42;' },
      });
    });
  });

  it('emits %0A (never %0D) for a selection spanning a CRLF line break', () => {
    const selection = mockSelection(1, 0, 2, 6); // 'first\r\nsecond'

    const result = generateFromSelection('head\r\nfirst\r\nsecond\r\ntail', selection);

    const expectedLink = 'src/file.ts:~:text=first%0Asecond';
    expect(result).toBeSuccessWith((link: string) => {
      expect(link).toBe(expectedLink);
      expect(link).not.toContain('%0D');
    });

    const parsed = parseTextFragment(expectedLink);
    expect(parsed).toBeSuccessWith((parsedLink: ParsedTextFragment) => {
      expect({ path: parsedLink.path, directive: parsedLink.directive }).toStrictEqual({
        path: 'src/file.ts',
        directive: { start: 'first\nsecond' },
      });
    });
  });

  it('refuses text that occurs on more than one line of a CRLF document', () => {
    const selection = mockSelection(0, 0, 0, 3); // 'dup'

    const result = generateFromSelection('dup\r\ndup', selection);

    expect(result).toHaveDetailedError('GENERATE_TEXT_FRAGMENT_TEXT_NOT_UNIQUE', {
      message: 'Selected text must be unique to generate a text fragment link',
      functionName: 'generateTextFragmentLink',
      details: { count: 2 },
    });
  });
});
