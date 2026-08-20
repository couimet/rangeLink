import { createMockUri } from '../../__tests__/helpers/createMockUri';
import { isFileUri } from '../isFileUri';

describe('isFileUri', () => {
  it('returns true for a file-scheme URI', () => {
    const uri = createMockUri('/tmp/test.ts');

    expect(isFileUri(uri)).toBe(true);
  });

  it('returns false for a remote-scheme URI', () => {
    const uri = createMockUri('/tmp/test.ts', { scheme: 'vscode-remote' });

    expect(isFileUri(uri)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isFileUri(undefined)).toBe(false);
  });
});
