#!/usr/bin/env node

/**
 * Generates a version.json file with build metadata including the commit hash.
 * This allows users to verify exactly which version of the extension they're running.
 *
 * Usage:
 *   node generate-version.js                     # Generate src/version.json only
 *   node generate-version.js --copy-to out       # Also copy to out/
 *   node generate-version.js --copy-to out,dist  # Also copy to out/ and dist/
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PACKAGE_ROOT = path.join(__dirname, '..');
const SOURCE_OUTPUT_PATH = path.join(PACKAGE_ROOT, 'src', 'version.json');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const copyToIndex = args.indexOf('--copy-to');
  if (copyToIndex === -1 || copyToIndex === args.length - 1) {
    return { copyTo: [] };
  }
  const copyDirs = args[copyToIndex + 1].split(',').map((dir) => dir.trim());
  return { copyTo: copyDirs };
};

const deleteIfExists = (filePath, label) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`  Deleted existing: ${label}`);
    return true;
  }
  return false;
};

try {
  const { copyTo } = parseArgs();

  // Get the commit hash (short version)
  const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();

  // Get the full commit hash
  const commitHashFull = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();

  // Get the commit date
  const commitDate = execSync('git log -1 --format=%cI', { encoding: 'utf-8' }).trim();

  // Check if there are uncommitted changes
  // Ignore publishing-instructions/ to avoid circular dependency
  const statusOutput = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
  const filteredStatus = statusOutput
    .split('\n')
    .filter((line) => line && !line.includes('publishing-instructions/'))
    .join('\n');
  const isDirty = filteredStatus !== '';

  // Get the branch name
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();

  // Read package.json version
  const packageJson = require('../package.json');
  const version = packageJson.version;

  // Create the version object
  const versionInfo = {
    version,
    commit: commitHash,
    commitFull: commitHashFull,
    commitDate,
    branch,
    isDirty,
    buildDate: new Date().toISOString(),
  };

  // Delete existing files first
  deleteIfExists(SOURCE_OUTPUT_PATH, 'src/version.json');
  for (const dir of copyTo) {
    const destPath = path.join(PACKAGE_ROOT, dir, 'version.json');
    deleteIfExists(destPath, `${dir}/version.json`);
  }

  // Write to src/version.json
  fs.writeFileSync(SOURCE_OUTPUT_PATH, JSON.stringify(versionInfo, null, 2));

  // Copy to additional directories
  for (const dir of copyTo) {
    const destDir = path.join(PACKAGE_ROOT, dir);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const destPath = path.join(destDir, 'version.json');
    fs.copyFileSync(SOURCE_OUTPUT_PATH, destPath);
  }

  // Output summary
  console.log(`✓ Generated version.json`);
  console.log(`  version:    ${version}`);
  console.log(`  commit:     ${commitHash}${isDirty ? ' (dirty)' : ''}`);
  console.log(`  commitFull: ${commitHashFull}`);
  console.log(`  commitDate: ${commitDate}`);
  console.log(`  branch:     ${branch}`);
  console.log(`  buildDate:  ${versionInfo.buildDate}`);
  if (copyTo.length > 0) {
    console.log(`  copied to:  ${copyTo.join(', ')}`);
  }

  process.exit(0);
} catch (error) {
  console.error('Error generating version info:', error.message);
  process.exit(1);
}
