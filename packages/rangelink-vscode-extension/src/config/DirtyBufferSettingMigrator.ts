import {
  LEGACY_WARN_ON_DIRTY_BUFFER,
  SETTING_NAMESPACE,
  SETTING_UNSAVED_FILE_ACTION,
  SETTING_UNSAVED_FILE_ACTION_FULL,
  VSC_CMD_OPEN_SETTINGS,
} from '../constants';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode, type UnsavedFileAction } from '../types';
import { formatMessage } from '../utils';

import type { ConfigReader } from './ConfigReader';
import type { ConfigInspection, ConfigInspectionValue } from './types';

import type { Logger } from '@couimet/logger-contract';
import * as vscode from 'vscode';

export interface DirtyBufferMigrationResult {
  migratedScopes: number;
  showedConversionToast: boolean;
}

type ScopedLegacyValue = {
  value: ConfigInspectionValue;
  target: vscode.ConfigurationTarget;
};

/**
 * Migrates the legacy boolean setting rangelink.warnOnDirtyBuffer to the enum
 * rangelink.unsavedFile.action. Runs once at activation.
 *
 * Each scope where the legacy key is set gets the new key written to the same
 * scope (false → 'continueAnyway', true → 'prompt'), then the legacy key is
 * removed. A conversion toast explains the rename only when a scope had false.
 * If the new key is already configured, it is left intact and only the legacy
 * key is dropped.
 */
export class DirtyBufferSettingMigrator {
  constructor(
    private readonly configReader: ConfigReader,
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {}

  async migrate(): Promise<DirtyBufferMigrationResult> {
    const fn = 'DirtyBufferSettingMigrator.migrate';
    const inspection = this.configReader.inspect(LEGACY_WARN_ON_DIRTY_BUFFER);

    if (!inspection) {
      this.logger.debug({ fn }, 'No legacy warnOnDirtyBuffer setting present, skipping migration');
      return { migratedScopes: 0, showedConversionToast: false };
    }

    const scopedValues = this.collectScopedValues(inspection);
    if (scopedValues.length === 0) {
      this.logger.debug({ fn }, 'Legacy warnOnDirtyBuffer key present but not set in any scope, skipping migration');
      return { migratedScopes: 0, showedConversionToast: false };
    }

    let migratedScopes = 0;
    let wroteNewKey = false;
    let hadFalseValue = false;
    let wroteFalseValue = false;

    for (const { value, target } of scopedValues) {
      const resource = target === vscode.ConfigurationTarget.WorkspaceFolder ? this.ideAdapter.workspaceFolders?.[0]?.uri : undefined;
      const newKeySetForTarget = this.isNewKeySetForTarget(target);
      if (!newKeySetForTarget) {
        await this.ideAdapter.updateConfiguration(SETTING_NAMESPACE, SETTING_UNSAVED_FILE_ACTION, this.toUnsavedFileAction(value), target, resource);
        wroteNewKey = true;
        if (value === false) {
          wroteFalseValue = true;
        }
      }
      await this.ideAdapter.updateConfiguration(SETTING_NAMESPACE, LEGACY_WARN_ON_DIRTY_BUFFER, undefined, target, resource);
      migratedScopes += 1;
      if (value === false) {
        hadFalseValue = true;
      }
      this.logger.debug({ fn, target: this.targetName(target), value, wroteNewKey: !newKeySetForTarget }, 'Migrated warnOnDirtyBuffer scope');
    }

    const showedConversionToast = wroteFalseValue;
    if (showedConversionToast) {
      await this.showConversionToast();
    }

    this.logger.info({ fn, migratedScopes, wroteNewKey, hadFalseValue }, 'warnOnDirtyBuffer migration complete');
    return { migratedScopes, showedConversionToast };
  }

  private isNewKeySetForTarget(target: vscode.ConfigurationTarget): boolean {
    const inspection = this.configReader.inspect(SETTING_UNSAVED_FILE_ACTION);
    if (inspection === undefined) {
      return false;
    }
    switch (target) {
      case vscode.ConfigurationTarget.Global:
        return inspection.globalValue !== undefined;
      case vscode.ConfigurationTarget.Workspace:
        return inspection.workspaceValue !== undefined;
      default:
        return inspection.workspaceFolderValue !== undefined;
    }
  }

  private collectScopedValues(inspection: ConfigInspection): ScopedLegacyValue[] {
    const scopes: ScopedLegacyValue[] = [];
    if (inspection.globalValue !== undefined) {
      scopes.push({ value: inspection.globalValue, target: vscode.ConfigurationTarget.Global });
    }
    if (inspection.workspaceValue !== undefined) {
      scopes.push({ value: inspection.workspaceValue, target: vscode.ConfigurationTarget.Workspace });
    }
    if (inspection.workspaceFolderValue !== undefined) {
      scopes.push({ value: inspection.workspaceFolderValue, target: vscode.ConfigurationTarget.WorkspaceFolder });
    }
    return scopes;
  }

  private toUnsavedFileAction(value: ConfigInspectionValue): UnsavedFileAction {
    return value === false ? 'continueAnyway' : 'prompt';
  }

  private targetName(target: vscode.ConfigurationTarget): string {
    switch (target) {
      case vscode.ConfigurationTarget.Global:
        return 'global';
      case vscode.ConfigurationTarget.Workspace:
        return 'workspace';
      default:
        return 'workspaceFolder';
    }
  }

  private async showConversionToast(): Promise<void> {
    const fn = 'DirtyBufferSettingMigrator.showConversionToast';
    const openSettings = formatMessage(MessageCode.INFO_UNSAVED_FILE_SETTING_MIGRATED_OPEN_SETTINGS);
    const selection = await this.ideAdapter.showInformationMessage(formatMessage(MessageCode.INFO_UNSAVED_FILE_SETTING_MIGRATED), openSettings);

    if (selection === openSettings) {
      await this.ideAdapter.executeCommand(VSC_CMD_OPEN_SETTINGS, SETTING_UNSAVED_FILE_ACTION_FULL);
      this.logger.debug({ fn }, 'Opened settings for unsavedFile.action');
    } else {
      this.logger.debug({ fn }, 'Conversion toast dismissed');
    }
  }
}
