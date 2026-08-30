import { ENV_RANGELINK_DEVELOPMENT_REPORT, ENV_RANGELINK_DEVELOPMENT_SCENARIO } from '../constants';

import { createDirtyBufferScenario, type DevelopmentScenarioResult, dirtyBufferScenarioSpecs } from './scenarios';

import { appendFileSync } from 'node:fs';
import * as vscode from 'vscode';

const scenarioRunners: Record<string, () => Promise<DevelopmentScenarioResult>> = {};
for (const spec of dirtyBufferScenarioSpecs) {
  scenarioRunners[spec.scenario] = createDirtyBufferScenario(spec);
}

export const runDevelopmentTests = async (): Promise<void> => {
  const reportPath = process.env[ENV_RANGELINK_DEVELOPMENT_REPORT];
  const scenario = process.env[ENV_RANGELINK_DEVELOPMENT_SCENARIO];

  if (scenario === undefined || scenario === '') {
    const detail = 'No scenario specified — the development-test driver always sets RANGELINK_DEVELOPMENT_SCENARIO';
    const result = { scenario: '', verdict: 'FAIL', detail } satisfies DevelopmentScenarioResult;
    await appendResult(reportPath, result);
    void vscode.window.showErrorMessage(`DEVELOPMENT TEST: ${detail}`);
    return;
  }

  const runner = scenarioRunners[scenario];

  if (runner === undefined) {
    const detail = `Unknown scenario "${scenario}" — known: ${Object.keys(scenarioRunners).join(', ')}`;
    const result = { scenario, verdict: 'FAIL', detail } satisfies DevelopmentScenarioResult;
    await appendResult(reportPath, result);
    void vscode.window.showErrorMessage(`DEVELOPMENT TEST ${scenario}: ${detail}`);
    return;
  }

  const result = await runner();
  await appendResult(reportPath, result);
  void vscode.window.showInformationMessage(`DEVELOPMENT TEST ${result.scenario}: ${result.verdict} — ${result.detail}`);
};

const appendResult = (reportPath: string | undefined, result: DevelopmentScenarioResult): void => {
  if (reportPath === undefined || reportPath === '') {
    return;
  }
  const line = JSON.stringify({ ...result, ts: new Date().toISOString() });
  appendFileSync(reportPath, `${line}\n`);
};
