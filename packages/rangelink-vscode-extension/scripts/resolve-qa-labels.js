#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ── Argument parsing ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let labelFilter = '';
let assistedOnly = false;
let noAssisted = false;
let yamlPath = '';

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--label':
      labelFilter = args[++i];
      break;
    case '--assisted':
      assistedOnly = true;
      break;
    case '--no-assisted':
      noAssisted = true;
      break;
    case '--yaml':
      yamlPath = args[++i];
      break;
    default:
      process.stderr.write(`Unknown option: ${args[i]}\n`);
      process.exit(1);
  }
}

if (!labelFilter) {
  process.stderr.write('Error: --label is required\n');
  process.exit(1);
}

// ── Auto-discover latest QA YAML ──────────────────────────────────────────────

const scriptDir = path.dirname(__filename);
const qaDir = path.join(scriptDir, '..', 'qa');

if (!yamlPath) {
  const files = fs
    .readdirSync(qaDir)
    .filter((f) => f.startsWith('qa-test-cases-v') && f.endsWith('.yaml'));

  if (files.length === 0) {
    process.stderr.write('Error: No QA YAML files found in qa/ directory\n');
    process.exit(1);
  }

  // Sort by embedded version (extract from filename like qa-test-cases-v1.1.0.yaml)
  files.sort((a, b) => {
    const va = a.match(/v(\d+\.\d+\.\d+)/)?.[1] ?? '';
    const vb = b.match(/v(\d+\.\d+\.\d+)/)?.[1] ?? '';
    if (va !== vb) return va.localeCompare(vb, undefined, { numeric: true });
    // If same version, no suffix wins (the base file)
    const suffixA = a.match(/v\d+\.\d+\.\d+-(.+)\.yaml$/)?.[1] ?? '';
    const suffixB = b.match(/v\d+\.\d+\.\d+-(.+)\.yaml$/)?.[1] ?? '';
    if (!suffixA && suffixB) return 1;
    if (suffixA && !suffixB) return -1;
    return suffixA.localeCompare(suffixB);
  });

  yamlPath = path.join(qaDir, files[files.length - 1]);
}

// ── Parse YAML ────────────────────────────────────────────────────────────────

const content = fs.readFileSync(yamlPath, 'utf8');
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

  // Test case entry: "  - id: some-id"
  const idMatch = line.match(/^\s+- id:\s*(.+)$/);
  if (idMatch) {
    finalizeCurrent();
    currentCase = { id: idMatch[1].trim(), automated: '', labels: [], feature: '' };
    continue;
  }

  if (!currentCase) continue;

  // automated field
  const autoMatch = line.match(/^\s+automated:\s*(.+)$/);
  if (autoMatch) {
    currentCase.automated = autoMatch[1].trim();
    inLabels = false;
    continue;
  }

  // feature field
  const featMatch = line.match(/^\s+feature:\s*(.+)$/);
  if (featMatch) {
    currentCase.feature = featMatch[1].trim().replace(/^'|'$/g, '');
    inLabels = false;
    continue;
  }

  // labels: key (opens label list)
  if (/^\s+labels:\s*$/.test(line)) {
    inLabels = true;
    continue;
  }

  // Label entry within labels block: "    - labelname"
  if (inLabels && /^\s+-\s+(\S+)/.test(line)) {
    const labelMatch = line.match(/^\s+-\s+(\S+)/);
    if (labelMatch) {
      currentCase.labels.push(labelMatch[1].trim());
    }
    continue;
  }

  // Any other key (not a label line) ends the labels block
  if (inLabels && /^\s+\w+/.test(line) && !/^\s+-\s+/.test(line)) {
    inLabels = false;
  }
}

finalizeCurrent();

// ── Filter and output ─────────────────────────────────────────────────────────

const matching = testCases.filter((tc) => {
  if (!tc.labels.includes(labelFilter)) return false;
  if (assistedOnly && tc.automated !== 'assisted') return false;
  if (noAssisted && tc.automated === 'assisted') return false;
  return true;
});

for (const tc of matching) {
  process.stdout.write(`${tc.id}\n`);
}
