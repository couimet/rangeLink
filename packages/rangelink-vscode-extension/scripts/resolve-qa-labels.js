#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ── Argument parsing ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let labelFilter = '';
let assistedOnly = false;
let noAssisted = false;
let automatedOnly = false;
let excludeLabel = '';
let outputFormat = 'lines';
let yamlPath = '';

const printUsage = () => {
  process.stderr.write(
    'Usage: resolve-qa-labels.js [--label <name>] [--assisted] [--no-assisted]\n' +
      '                          [--automated-only] [--exclude-label <name>]\n' +
      '                          [--format csv|lines] [--yaml <path>]\n',
  );
  process.exit(2);
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--label':
      if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
        process.stderr.write('Error: --label requires a value\n');
        process.exit(1);
      }
      labelFilter = args[++i];
      break;
    case '--assisted':
      assistedOnly = true;
      break;
    case '--no-assisted':
      noAssisted = true;
      break;
    case '--automated-only':
      automatedOnly = true;
      break;
    case '--exclude-label':
      if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
        process.stderr.write('Error: --exclude-label requires a value\n');
        process.exit(1);
      }
      excludeLabel = args[++i];
      break;
    case '--format':
      if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
        process.stderr.write('Error: --format requires a value\n');
        process.exit(1);
      }
      outputFormat = args[++i];
      if (outputFormat !== 'csv' && outputFormat !== 'lines') {
        process.stderr.write("Error: --format must be 'csv' or 'lines'\n");
        process.exit(1);
      }
      break;
    case '--yaml':
      if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
        process.stderr.write('Error: --yaml requires a value\n');
        process.exit(1);
      }
      yamlPath = args[++i];
      break;
    case '--help':
      printUsage();
      break;
    default:
      process.stderr.write(`Unknown option: ${args[i]}\n`);
      process.exit(1);
  }
}

if (assistedOnly && noAssisted) {
  process.stderr.write('Error: --assisted and --no-assisted are mutually exclusive\n');
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
      .filter((f) => f.startsWith('qa-test-cases-v') && f.endsWith('.yaml'));
  } catch (err) {
    process.stderr.write(`Error: Cannot read QA directory ${qaDir}: ${err.message}\n`);
    process.exit(1);
  }

  if (files.length === 0) {
    process.stderr.write('Error: No QA YAML files found in qa/ directory\n');
    process.exit(1);
  }

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
    currentCase = { id: idMatch[1].trim(), automated: '', labels: [], feature: '' };
    continue;
  }

  if (!currentCase) continue;

  const autoMatch = line.match(/^\s+automated:\s*(.+)$/);
  if (autoMatch) {
    currentCase.automated = autoMatch[1].trim();
    inLabels = false;
    continue;
  }

  const featMatch = line.match(/^\s+feature:\s*(.+)$/);
  if (featMatch) {
    currentCase.feature = featMatch[1].trim().replace(/^'|'$/g, '');
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

// ── Filter and output ─────────────────────────────────────────────────────────

const matching = testCases.filter((tc) => {
  if (labelFilter && !tc.labels.includes(labelFilter)) return false;
  if (excludeLabel && tc.labels.includes(excludeLabel)) return false;
  if (automatedOnly && tc.automated !== 'true') return false;
  if (assistedOnly && tc.automated !== 'assisted') return false;
  if (noAssisted && tc.automated === 'assisted') return false;
  return true;
});

const ids = matching.map((tc) => tc.id);

if (outputFormat === 'csv') {
  process.stdout.write(ids.join(', '));
} else {
  for (const id of ids) {
    process.stdout.write(`${id}\n`);
  }
}
