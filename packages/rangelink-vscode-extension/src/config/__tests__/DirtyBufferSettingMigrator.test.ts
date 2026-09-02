import { createMockConfigReader, createMockVscodeAdapter } from '../../__tests__/helpers';
import { LEGACY_WARN_ON_DIRTY_BUFFER, SETTING_UNSAVED_FILE_ACTION } from '../../constants';
import { DirtyBufferSettingMigrator } from '../DirtyBufferSettingMigrator';
import type { ConfigInspection } from '../types';

import { createMockLogger } from '@couimet/logger-contract-testing';
import * as vscode from 'vscode';

const CONVERSION_TOAST_TEXT =
  'RangeLink renamed the setting rangelink.warnOnDirtyBuffer to rangelink.unsavedFile.action. Your value false is now continueAnyway.';
const OPEN_SETTINGS_BUTTON = 'Open Settings';

const legacyInspection = (value: boolean, scope: 'global' | 'workspace' | 'folder'): ConfigInspection => ({
  key: LEGACY_WARN_ON_DIRTY_BUFFER,
  globalValue: scope === 'global' ? value : undefined,
  workspaceValue: scope === 'workspace' ? value : undefined,
  workspaceFolderValue: scope === 'folder' ? value : undefined,
});

const newKeyInspection = (): ConfigInspection => ({
  key: SETTING_UNSAVED_FILE_ACTION,
  globalValue: 'prompt',
  workspaceValue: undefined,
  workspaceFolderValue: undefined,
});

describe('DirtyBufferSettingMigrator', () => {
  const mockLogger = createMockLogger();

  const createMigrator = (inspections: Record<string, ConfigInspection | undefined>) => {
    const configReader = createMockConfigReader();
    configReader.inspect.mockImplementation((key: string) => inspections[key]);
    const mockAdapter = createMockVscodeAdapter();
    const updateSpy = jest.spyOn(mockAdapter, 'updateConfiguration').mockResolvedValue(undefined);
    const showInfoSpy = jest.spyOn(mockAdapter, 'showInformationMessage').mockResolvedValue(undefined);
    const execSpy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    const migrator = new DirtyBufferSettingMigrator(configReader, mockAdapter, mockLogger);
    return { migrator, mockAdapter, updateSpy, showInfoSpy, execSpy };
  };

  it('skips migration when no legacy setting is present', async () => {
    const { migrator, updateSpy, showInfoSpy } = createMigrator({ [LEGACY_WARN_ON_DIRTY_BUFFER]: undefined });

    const result = await migrator.migrate();

    expect(result).toStrictEqual({ migratedScopes: 0, showedConversionToast: false });
    expect(updateSpy).not.toHaveBeenCalled();
    expect(showInfoSpy).not.toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'DirtyBufferSettingMigrator.migrate' },
      'No legacy warnOnDirtyBuffer setting present, skipping migration',
    );
  });

  it('skips migration when the legacy key is set in no scope', async () => {
    const unsetLegacy: ConfigInspection = {
      key: LEGACY_WARN_ON_DIRTY_BUFFER,
      globalValue: undefined,
      workspaceValue: undefined,
      workspaceFolderValue: undefined,
    };
    const { migrator, updateSpy, showInfoSpy } = createMigrator({ [LEGACY_WARN_ON_DIRTY_BUFFER]: unsetLegacy });

    const result = await migrator.migrate();

    expect(result).toStrictEqual({ migratedScopes: 0, showedConversionToast: false });
    expect(updateSpy).not.toHaveBeenCalled();
    expect(showInfoSpy).not.toHaveBeenCalled();
  });

  it('converts warnOnDirtyBuffer=false at global scope to continueAnyway and shows the conversion toast', async () => {
    const { migrator, updateSpy, showInfoSpy } = createMigrator({ [LEGACY_WARN_ON_DIRTY_BUFFER]: legacyInspection(false, 'global') });

    const result = await migrator.migrate();

    expect(result).toStrictEqual({ migratedScopes: 1, showedConversionToast: true });
    expect(updateSpy).toHaveBeenCalledWith('rangelink', SETTING_UNSAVED_FILE_ACTION, 'continueAnyway', vscode.ConfigurationTarget.Global, undefined);
    expect(updateSpy).toHaveBeenCalledWith('rangelink', LEGACY_WARN_ON_DIRTY_BUFFER, undefined, vscode.ConfigurationTarget.Global, undefined);
    expect(showInfoSpy).toHaveBeenCalledWith(CONVERSION_TOAST_TEXT, OPEN_SETTINGS_BUTTON);
  });

  it('converts warnOnDirtyBuffer=true at workspace scope to prompt without a toast', async () => {
    const { migrator, updateSpy, showInfoSpy } = createMigrator({ [LEGACY_WARN_ON_DIRTY_BUFFER]: legacyInspection(true, 'workspace') });

    const result = await migrator.migrate();

    expect(result).toStrictEqual({ migratedScopes: 1, showedConversionToast: false });
    expect(updateSpy).toHaveBeenCalledWith('rangelink', SETTING_UNSAVED_FILE_ACTION, 'prompt', vscode.ConfigurationTarget.Workspace, undefined);
    expect(updateSpy).toHaveBeenCalledWith('rangelink', LEGACY_WARN_ON_DIRTY_BUFFER, undefined, vscode.ConfigurationTarget.Workspace, undefined);
    expect(showInfoSpy).not.toHaveBeenCalled();
  });

  it('migrates every scope where the legacy key is set and shows a single toast', async () => {
    const inspection: ConfigInspection = {
      key: LEGACY_WARN_ON_DIRTY_BUFFER,
      globalValue: false,
      workspaceValue: true,
      workspaceFolderValue: undefined,
    };
    const { migrator, updateSpy, showInfoSpy } = createMigrator({ [LEGACY_WARN_ON_DIRTY_BUFFER]: inspection });

    const result = await migrator.migrate();

    expect(result).toStrictEqual({ migratedScopes: 2, showedConversionToast: true });
    expect(updateSpy).toHaveBeenCalledWith('rangelink', SETTING_UNSAVED_FILE_ACTION, 'continueAnyway', vscode.ConfigurationTarget.Global, undefined);
    expect(updateSpy).toHaveBeenCalledWith('rangelink', SETTING_UNSAVED_FILE_ACTION, 'prompt', vscode.ConfigurationTarget.Workspace, undefined);
    expect(showInfoSpy).toHaveBeenCalledTimes(1);
  });

  it('preserves an already-set unsavedFile.action and drops only the legacy key without a toast', async () => {
    const inspections = {
      [LEGACY_WARN_ON_DIRTY_BUFFER]: legacyInspection(false, 'global'),
      [SETTING_UNSAVED_FILE_ACTION]: newKeyInspection(),
    };
    const { migrator, updateSpy, showInfoSpy } = createMigrator(inspections);

    const result = await migrator.migrate();

    expect(result).toStrictEqual({ migratedScopes: 1, showedConversionToast: false });
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith('rangelink', LEGACY_WARN_ON_DIRTY_BUFFER, undefined, vscode.ConfigurationTarget.Global, undefined);
    expect(showInfoSpy).not.toHaveBeenCalled();
  });

  it('migrates a scope whose target lacks the new key even when another scope has it', async () => {
    const inspections = {
      [LEGACY_WARN_ON_DIRTY_BUFFER]: {
        key: LEGACY_WARN_ON_DIRTY_BUFFER,
        globalValue: false,
        workspaceValue: true,
        workspaceFolderValue: undefined,
      },
      [SETTING_UNSAVED_FILE_ACTION]: newKeyInspection(),
    };
    const { migrator, updateSpy, showInfoSpy } = createMigrator(inspections);

    const result = await migrator.migrate();

    expect(result).toStrictEqual({ migratedScopes: 2, showedConversionToast: false });
    expect(updateSpy).toHaveBeenCalledWith('rangelink', SETTING_UNSAVED_FILE_ACTION, 'prompt', vscode.ConfigurationTarget.Workspace, undefined);
    expect(updateSpy).not.toHaveBeenCalledWith('rangelink', SETTING_UNSAVED_FILE_ACTION, 'continueAnyway', vscode.ConfigurationTarget.Global);
    expect(updateSpy).toHaveBeenCalledTimes(3);
    expect(showInfoSpy).not.toHaveBeenCalled();
  });

  it('migrates a legacy value set at workspace-folder scope', async () => {
    const { migrator, mockAdapter, updateSpy, showInfoSpy } = createMigrator({ [LEGACY_WARN_ON_DIRTY_BUFFER]: legacyInspection(false, 'folder') });
    const folderUri = mockAdapter.workspaceFolders?.[0]?.uri;

    const result = await migrator.migrate();

    expect(result).toStrictEqual({ migratedScopes: 1, showedConversionToast: true });
    expect(updateSpy).toHaveBeenCalledWith('rangelink', SETTING_UNSAVED_FILE_ACTION, 'continueAnyway', vscode.ConfigurationTarget.WorkspaceFolder, folderUri);
    expect(updateSpy).toHaveBeenCalledWith('rangelink', LEGACY_WARN_ON_DIRTY_BUFFER, undefined, vscode.ConfigurationTarget.WorkspaceFolder, folderUri);
    expect(showInfoSpy).toHaveBeenCalledWith(CONVERSION_TOAST_TEXT, OPEN_SETTINGS_BUTTON);
  });

  it('preserves an already-set unsavedFile.action at workspace-folder scope', async () => {
    const inspections = {
      [LEGACY_WARN_ON_DIRTY_BUFFER]: legacyInspection(false, 'folder'),
      [SETTING_UNSAVED_FILE_ACTION]: {
        key: SETTING_UNSAVED_FILE_ACTION,
        globalValue: undefined,
        workspaceValue: undefined,
        workspaceFolderValue: 'prompt',
      },
    };
    const { migrator, mockAdapter, updateSpy, showInfoSpy } = createMigrator(inspections);
    const folderUri = mockAdapter.workspaceFolders?.[0]?.uri;

    const result = await migrator.migrate();

    expect(result).toStrictEqual({ migratedScopes: 1, showedConversionToast: false });
    expect(updateSpy).toHaveBeenCalledWith('rangelink', LEGACY_WARN_ON_DIRTY_BUFFER, undefined, vscode.ConfigurationTarget.WorkspaceFolder, folderUri);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(showInfoSpy).not.toHaveBeenCalled();
  });

  it('migrates a workspace-folder legacy value when the new key is set only at global scope', async () => {
    const inspections = {
      [LEGACY_WARN_ON_DIRTY_BUFFER]: legacyInspection(false, 'folder'),
      [SETTING_UNSAVED_FILE_ACTION]: newKeyInspection(),
    };
    const { migrator, mockAdapter, updateSpy, showInfoSpy } = createMigrator(inspections);
    const folderUri = mockAdapter.workspaceFolders?.[0]?.uri;

    const result = await migrator.migrate();

    expect(result).toStrictEqual({ migratedScopes: 1, showedConversionToast: true });
    expect(updateSpy).toHaveBeenCalledWith('rangelink', SETTING_UNSAVED_FILE_ACTION, 'continueAnyway', vscode.ConfigurationTarget.WorkspaceFolder, folderUri);
    expect(updateSpy).toHaveBeenCalledWith('rangelink', LEGACY_WARN_ON_DIRTY_BUFFER, undefined, vscode.ConfigurationTarget.WorkspaceFolder, folderUri);
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(showInfoSpy).toHaveBeenCalledWith(CONVERSION_TOAST_TEXT, OPEN_SETTINGS_BUTTON);
  });

  it('passes the owning folder URI when migrating a workspace-folder-scoped value', async () => {
    const { migrator, mockAdapter, updateSpy } = createMigrator({ [LEGACY_WARN_ON_DIRTY_BUFFER]: legacyInspection(false, 'folder') });
    const folderUri = mockAdapter.workspaceFolders?.[0]?.uri;

    await migrator.migrate();

    expect(updateSpy).toHaveBeenCalledWith('rangelink', SETTING_UNSAVED_FILE_ACTION, 'continueAnyway', vscode.ConfigurationTarget.WorkspaceFolder, folderUri);
    expect(updateSpy).toHaveBeenCalledWith('rangelink', LEGACY_WARN_ON_DIRTY_BUFFER, undefined, vscode.ConfigurationTarget.WorkspaceFolder, folderUri);
  });

  it('opens settings when the conversion toast action is chosen', async () => {
    const { migrator, showInfoSpy, execSpy } = createMigrator({ [LEGACY_WARN_ON_DIRTY_BUFFER]: legacyInspection(false, 'workspace') });
    showInfoSpy.mockResolvedValue(OPEN_SETTINGS_BUTTON);

    await migrator.migrate();

    expect(execSpy).toHaveBeenCalledWith('workbench.action.openSettings', 'rangelink.unsavedFile.action');
    expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'DirtyBufferSettingMigrator.showConversionToast' }, 'Opened settings for unsavedFile.action');
  });

  it('logs migration completion with details', async () => {
    const { migrator } = createMigrator({ [LEGACY_WARN_ON_DIRTY_BUFFER]: legacyInspection(true, 'global') });

    await migrator.migrate();

    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'DirtyBufferSettingMigrator.migrate', migratedScopes: 1, wroteNewKey: true, hadFalseValue: false },
      'warnOnDirtyBuffer migration complete',
    );
  });
});
