#!/usr/bin/env node

/**
 * Generates a version.json file with build metadata including the commit hash.
 * This allows users to verify exactly which version of the extension they're running.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Get the commit hash (short version)
  const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();

  // Get the full commit hash
  const commitHashFull = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();

  // Get the commit date
  const commitDate = execSync('git log -1 --format=%cI', { encoding: 'utf-8' }).trim();

  // Check if there are uncommitted changes
  const isDirty = execSync('git status --porcelain', { encoding: 'utf-8' }).trim() !== '';

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

  // Write to src/version.json
  const outputPath = path.join(__dirname, '..', 'src', 'version.json');
  fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));

  console.log(`✓ Generated version info: v${version} (${commitHash}${isDirty ? '-dirty' : ''})`);

  process.exit(0);
} catch (error) {
  console.error('Error generating version info:', error.message);
  process.exit(1);
}
