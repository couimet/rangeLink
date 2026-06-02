#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ── Argument parsing ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const labelFilters = [];
const featureFilters = [];
let assistedOnly = false;
let excludeAssisted = false;
let automatedOnly = false;
const excludeLabels = [];
const excludeFeatures = [];
let jsonOutput = false;
let yamlPath = '';

const printUsage = (exitCode = 2) => {
  process.stderr.write(
    'Usage: resolve-qa-labels.js [--label <name>]... [--assisted] [--exclude-assisted]\n' +
      '                          [--automated-only] [--exclude-label <name>]...\n' +
      '                          [--feature <slug>]... [--exclude-feature <slug>]...\n' +
      '                          [--json] [--yaml <path>]\n',
  );
  process.exit(exitCode);
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--label':
      if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
        process.stderr.write('Error: --label requires a value\n');
        process.exit(1);
      }
      labelFilters.push(args[++i]);
      break;
    case '--assisted':
      assistedOnly = true;
      break;
    case '--no-assisted':
    case '--exclude-assisted':
      excludeAssisted = true;
      break;
    case '--automated-only':
      automatedOnly = true;
      break;
    case '--exclude-label':
      if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
        process.stderr.write('Error: --exclude-label requires a value\n');
        process.exit(1);
      }
      excludeLabels.push(args[++i]);
      break;
    case '--feature':
      if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
        process.stderr.write('Error: --feature requires a value\n');
        process.exit(1);
      }
      featureFilters.push(args[++i]);
      break;
    case '--exclude-feature':
      if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
        process.stderr.write('Error: --exclude-feature requires a value\n');
        process.exit(1);
      }
      excludeFeatures.push(args[++i]);
      break;
    case '--json':
      jsonOutput = true;
      break;
    case '--yaml':
      if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
        process.stderr.write('Error: --yaml requires a value\n');
        process.exit(1);
      }
      yamlPath = args[++i];
      break;
    case '--help':
      printUsage(0);
      break;
    default:
      process.stderr.write(`Unknown option: ${args[i]}\n`);
      process.exit(1);
  }
}

if (assistedOnly && excludeAssisted) {
  process.stderr.write('Error: --assisted and --exclude-assisted are mutually exclusive\n');
  process.exit(1);
}

// ── Auto-discover latest QA YAML ──────────────────────────────────────────────

const scriptDir = path.dirname(__filename);
const qaDir = path.join(scriptDir, '..', 'qa');

if (!yamlPath) {
  let files;
  try {
    files = fs
      .readdirSync(qaDir)
      .filter((f) => f.startsWith('qa-test-cases-') && f.endsWith('.yaml'));
  } catch (err) {
    process.stderr.write(`Error: Cannot read QA directory ${qaDir}: ${err.message}\n`);
    process.exit(1);
  }

  if (files.length === 0) {
    process.stderr.write('Error: No QA YAML files found in qa/ directory\n');
    process.exit(1);
  }

  // Prefer the current development file when it exists; otherwise fall
  // back to the version sort (which doesn't match 'unreleased', causing
  // it to lose to any versioned file).
  const unreleased = files.find((f) => f === 'qa-test-cases-unreleased.yaml');
  if (unreleased) {
    yamlPath = path.join(qaDir, unreleased);
  } else {
    files.sort((a, b) => {
      const va = a.match(/v(\d+\.\d+\.\d+)/)?.[1] ?? '';
      const vb = b.match(/v(\d+\.\d+\.\d+)/)?.[1] ?? '';
      if (va !== vb) return va.localeCompare(vb, undefined, { numeric: true });
      const suffixA = a.match(/v\d+\.\d+\.\d+-(.+)\.yaml$/)?.[1] ?? '';
      const suffixB = b.match(/v\d+\.\d+\.\d+-(.+)\.yaml$/)?.[1] ?? '';
      if (!suffixA && suffixB) return 1;
      if (suffixA && !suffixB) return -1;
      return suffixA.localeCompare(suffixB);
    });

    yamlPath = path.join(qaDir, files[files.length - 1]);
  }
}

// ── Parse YAML ────────────────────────────────────────────────────────────────

let content;
try {
  content = fs.readFileSync(yamlPath, 'utf8');
} catch (err) {
  process.stderr.write(`Error: Cannot read YAML file ${yamlPath}: ${err.message}\n`);
  process.exit(1);
}
const lines = content.split('\n');

const testCases = [];
let currentCase = null;
let inLabels = false;

const finalizeCurrent = () => {
  if (currentCase) {
    testCases.push(currentCase);
    currentCase = null;
  }
  inLabels = false;
};

for (const rawLine of lines) {
  const line = rawLine;

  const idMatch = line.match(/^\s+- id:\s*(.+)$/);
  if (idMatch) {
    finalizeCurrent();
    currentCase = {
      id: idMatch[1].trim(),
      automated: '',
      labels: [],
      feature: '',
      nonAutomatableReason: '',
    };
    continue;
  }

  if (!currentCase) continue;

  const autoMatch = line.match(/^\s+automated:\s*(.+)$/);
  if (autoMatch) {
    const raw = autoMatch[1].trim();
    currentCase.automated =
      raw.length >= 2 &&
      ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))
        ? raw.slice(1, -1)
        : raw;
    inLabels = false;
    continue;
  }

  const reasonMatch = line.match(/^\s+non_automatable_reason:\s*(.+)$/);
  if (reasonMatch) {
    const raw = reasonMatch[1].trim();
    currentCase.nonAutomatableReason =
      raw.length >= 2 &&
      ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))
        ? raw.slice(1, -1)
        : raw;
    inLabels = false;
    continue;
  }

  const featMatch = line.match(/^\s+feature:\s*(.+)$/);
  if (featMatch) {
    const rawFeature = featMatch[1].trim();
    currentCase.feature =
      rawFeature.length >= 2 &&
      ((rawFeature.startsWith('"') && rawFeature.endsWith('"')) ||
        (rawFeature.startsWith("'") && rawFeature.endsWith("'")))
        ? rawFeature.slice(1, -1)
        : rawFeature;
    inLabels = false;
    continue;
  }

  const scenarioMatch = line.match(/^\s+scenario:\s*(.+)$/);
  if (scenarioMatch) {
    const rawScenario = scenarioMatch[1].trim();
    currentCase.scenario =
      rawScenario.length >= 2 &&
      ((rawScenario.startsWith('"') && rawScenario.endsWith('"')) ||
        (rawScenario.startsWith("'") && rawScenario.endsWith("'")))
        ? rawScenario.slice(1, -1)
        : rawScenario;
    inLabels = false;
    continue;
  }

  if (/^\s+labels:\s*$/.test(line)) {
    inLabels = true;
    continue;
  }

  if (inLabels && /^\s+-\s+(\S+)/.test(line)) {
    const labelMatch = line.match(/^\s+-\s+(\S+)/);
    if (labelMatch) {
      currentCase.labels.push(labelMatch[1].trim());
    }
    continue;
  }

  if (inLabels && /^\s+\w+/.test(line) && !/^\s+-\s+/.test(line)) {
    inLabels = false;
  }
}

finalizeCurrent();

// ── Shared filter ──────────────────────────────────────────────────────────────

const filterTc = (tc) => {
  if (labelFilters.length > 0 && !labelFilters.some((l) => tc.labels.includes(l))) return false;
  if (excludeLabels.length > 0 && excludeLabels.some((l) => tc.labels.includes(l))) return false;
  if (featureFilters.length > 0 && !featureFilters.includes(tc.feature)) return false;
  if (excludeFeatures.length > 0 && excludeFeatures.includes(tc.feature)) return false;
  if (automatedOnly && tc.automated !== 'true') return false;
  if (assistedOnly && tc.automated !== 'assisted') return false;
  if (excludeAssisted && tc.automated === 'assisted') return false;
  return true;
};

// ── JSON output ────────────────────────────────────────────────

if (jsonOutput) {
  const groups = {};
  const cursorTcs = [];
  const ubuntuTcs = [];
  let totalAssisted = 0;
  let totalManual = 0;

  for (const tc of testCases.filter(filterTc)) {
    const m = tc.id.match(/^(.*?)-\d{3}$/);
    const prefix = m ? m[1] : tc.id;
    (groups[prefix] ??= []).push(tc);
  }

  const resultGroups = [];

  const sortedPrefixes = Object.keys(groups).sort((a, b) => a.localeCompare(b));

  for (const prefix of sortedPrefixes) {
    const tcList = groups[prefix];
    const reasonCounts = {};
    let automatedCount = 0;
    let assistedCount = 0;
    let manualCount = 0;
    let requiresExtensions = false;

    for (const tc of tcList) {
      const labels = tc.labels || [];

      if (labels.includes('cursor') && tc.automated !== 'true') {
        cursorTcs.push({
          id: tc.id,
          feature: tc.feature,
          scenario: tc.scenario || '',
          automated: tc.automated === 'false' ? false : tc.automated,
          nonAutomatableReason: tc.nonAutomatableReason || undefined,
        });
        continue;
      }

      if (labels.includes('ubuntu') && tc.automated !== 'true') {
        ubuntuTcs.push({
          id: tc.id,
          feature: tc.feature,
          scenario: tc.scenario || '',
          automated: tc.automated === 'false' ? false : tc.automated,
          nonAutomatableReason: tc.nonAutomatableReason || undefined,
        });
        continue;
      }

      if (labels.includes('requires-extensions')) {
        requiresExtensions = true;
      }

      if (tc.automated === 'true') {
        automatedCount++;
      } else if (tc.automated === 'assisted') {
        assistedCount++;
      } else if (tc.automated === 'false') {
        manualCount++;
        const reason = tc.nonAutomatableReason || 'unspecified';
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      }
    }

    const total = automatedCount + assistedCount + manualCount;
    if (total === 0) continue;

    totalAssisted += assistedCount;
    totalManual += manualCount;

    const feature = tcList.length > 0 ? tcList[0].feature : 'Uncategorized';

    resultGroups.push({
      prefix,
      feature: feature,
      automated: automatedCount,
      assisted: assistedCount,
      manual: manualCount,
      total,
      requires_extensions: requiresExtensions,
      ...(Object.keys(reasonCounts).length > 0 ? { reasons: reasonCounts } : {}),
    });
  }

  for (const tc of cursorTcs) {
    if (tc.automated === 'assisted') totalAssisted++;
    else if (tc.automated === false) totalManual++;
  }

  for (const tc of ubuntuTcs) {
    if (tc.automated === 'assisted') totalAssisted++;
    else if (tc.automated === false) totalManual++;
  }

  process.stdout.write(
    JSON.stringify({
      groups: resultGroups,
      cursor_tcs: cursorTcs,
      ubuntu_tcs: ubuntuTcs,
      total_assisted: totalAssisted,
      total_manual: totalManual,
    }),
  );
  process.exit(0);
}

// ── Filter and output ─────────────────────────────────────────────────────────

const matching = testCases.filter(filterTc);

const ids = matching.map((tc) => tc.id);

for (const id of ids) {
  process.stdout.write(`${id}\n`);
}
