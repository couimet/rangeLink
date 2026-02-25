import * as vscode from 'vscode';

import { buildFilePickerItems } from '../../../destinations/utils/buildFilePickerItems';
import type { FileBindableQuickPickItem } from '../../../types';
import { createMockEligibleFile } from '../../helpers/createMockEligibleFile';
import type { MockEligibleFileOptions } from '../../helpers/createMockEligibleFile';

const separator = (label: string): vscode.QuickPickItem => ({
  label,
  kind: vscode.QuickPickItemKind.Separator,
});

const makeFileItem = (
  options: MockEligibleFileOptions,
  description?: string,
): FileBindableQuickPickItem => {
  const fileInfo = createMockEligibleFile(options);
  return {
    label: fileInfo.filename,
    displayName: fileInfo.filename,
    description,
    bindOptions: { kind: 'text-editor', uri: fileInfo.uri, viewColumn: fileInfo.viewColumn },
    itemKind: 'bindable',
    fileInfo,
    boundState: fileInfo.boundState,
  };
};

describe('buildFilePickerItems', () => {
  it('prefixes active files with Active Files separator', () => {
    const activeFile = makeFileItem({ filename: 'app.ts', viewColumn: 1, isCurrentInGroup: true });

    const result = buildFilePickerItems([activeFile]);

    expect(result).toStrictEqual([separator('Active Files'), activeFile]);
  });

  it('prefixes inactive files with Tab Group N separator grouped by viewColumn', () => {
    const inactive1 = makeFileItem({ filename: 'a.ts', viewColumn: 1 });
    const inactive2 = makeFileItem({ filename: 'b.ts', viewColumn: 1 });

    const result = buildFilePickerItems([inactive1, inactive2]);

    expect(result).toStrictEqual([separator('Tab Group 1'), inactive1, inactive2]);
  });

  it('produces Active Files section then per-group sections for mixed input', () => {
    const active = makeFileItem({ filename: 'app.ts', viewColumn: 1, isCurrentInGroup: true });
    const inactive1 = makeFileItem({ filename: 'b.ts', viewColumn: 1 });
    const inactive2 = makeFileItem({ filename: 'c.ts', viewColumn: 2 });

    const result = buildFilePickerItems([active, inactive1, inactive2]);

    expect(result).toStrictEqual([
      separator('Active Files'),
      active,
      separator('Tab Group 1'),
      inactive1,
      separator('Tab Group 2'),
      inactive2,
    ]);
  });

  it('produces no per-group sections when all files are active', () => {
    const active1 = makeFileItem({ filename: 'a.ts', viewColumn: 1, isCurrentInGroup: true });
    const active2 = makeFileItem({ filename: 'b.ts', viewColumn: 2, isCurrentInGroup: true });

    const result = buildFilePickerItems([active1, active2]);

    expect(result).toStrictEqual([separator('Active Files'), active1, active2]);
  });

  it('produces no Active Files section when no files are current-in-group', () => {
    const inactive1 = makeFileItem({ filename: 'a.ts', viewColumn: 1 });
    const inactive2 = makeFileItem({ filename: 'b.ts', viewColumn: 2 });

    const result = buildFilePickerItems([inactive1, inactive2]);

    expect(result).toStrictEqual([
      separator('Tab Group 1'),
      inactive1,
      separator('Tab Group 2'),
      inactive2,
    ]);
  });

  it('sorts per-group sections by viewColumn in ascending order', () => {
    const inactive3 = makeFileItem({ filename: 'c.ts', viewColumn: 3 });
    const inactive1 = makeFileItem({ filename: 'a.ts', viewColumn: 1 });
    const inactive2 = makeFileItem({ filename: 'b.ts', viewColumn: 2 });

    const result = buildFilePickerItems([inactive3, inactive1, inactive2]);

    expect(result).toStrictEqual([
      separator('Tab Group 1'),
      inactive1,
      separator('Tab Group 2'),
      inactive2,
      separator('Tab Group 3'),
      inactive3,
    ]);
  });

  it('preserves input order within each section', () => {
    const active1 = makeFileItem({ filename: 'z.ts', viewColumn: 1, isCurrentInGroup: true });
    const active2 = makeFileItem({ filename: 'a.ts', viewColumn: 1, isCurrentInGroup: true });
    const inactive1 = makeFileItem({ filename: 'z.ts', viewColumn: 1 });
    const inactive2 = makeFileItem({ filename: 'a.ts', viewColumn: 1 });

    const result = buildFilePickerItems([active1, active2, inactive1, inactive2]);

    expect(result).toStrictEqual([
      separator('Active Files'),
      active1,
      active2,
      separator('Tab Group 1'),
      inactive1,
      inactive2,
    ]);
  });

  it('passes through bound file description unchanged', () => {
    const boundFile = makeFileItem(
      { filename: 'app.ts', viewColumn: 1, isCurrentInGroup: true, boundState: 'bound' },
      'bound',
    );

    const result = buildFilePickerItems([boundFile]);

    expect(result).toStrictEqual([separator('Active Files'), boundFile]);
  });

  it('passes through disambiguated description unchanged', () => {
    const fileWithDisambiguator = makeFileItem(
      { filename: 'util.ts', viewColumn: 1, isCurrentInGroup: true },
      '…/a',
    );

    const result = buildFilePickerItems([fileWithDisambiguator]);

    expect(result).toStrictEqual([separator('Active Files'), fileWithDisambiguator]);
  });

  it('returns empty array for empty input', () => {
    expect(buildFilePickerItems([])).toStrictEqual([]);
  });
});
