#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const MAX_LINES = 200;
const SOURCE_DIRS = ['client/src', 'server/src'];
const VALID_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);

// Legacy exceptions to keep CI green while Phase 1+ decomposition is in progress.
const LEGACY_ALLOWLIST = new Set([
  'client/src/app.ts',
  'client/src/components/dialogs/PublishRequestDialog.tsx',
  'client/src/components/dialogs/ShareExportDialog.tsx',
  'client/src/core/controller/BaseController.ts',
  'client/src/engines/strudel/editor/StrudelHighlighter.ts',
  'client/src/engines/strudel/runtime/StrudelRuntime.ts',
  'client/src/engines/textmode/examples/tutorial.ts',
  'client/src/engines/textmode/runtime/host/TextmodeRuntime.ts',
]);

function shouldIgnore(relativePath) {
  if (relativePath.endsWith('.d.ts')) return true;
  if (relativePath.endsWith('generatedTypes.ts')) return true;
  if (relativePath.includes('/dist/')) return true;
  if (relativePath.includes('/node_modules/')) return true;
  return false;
}

function collectFiles(dirPath, acc = []) {
  for (const entry of readdirSync(dirPath)) {
    const fullPath = path.join(dirPath, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectFiles(fullPath, acc);
      continue;
    }

    if (!VALID_EXTENSIONS.has(path.extname(fullPath))) {
      continue;
    }

    acc.push(fullPath);
  }

  return acc;
}

function countEffectiveLines(content) {
  const lines = content.split(/\r?\n/);
  let inBlockComment = false;
  let count = 0;

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    while (line.length > 0) {
      if (inBlockComment) {
        const blockEnd = line.indexOf('*/');
        if (blockEnd === -1) {
          line = '';
          break;
        }

        line = line.slice(blockEnd + 2).trim();
        inBlockComment = false;
        continue;
      }

      if (line.startsWith('//')) {
        line = '';
        break;
      }

      const blockStart = line.indexOf('/*');
      if (blockStart === -1) {
        break;
      }

      const blockEnd = line.indexOf('*/', blockStart + 2);
      if (blockStart === 0 && blockEnd === -1) {
        inBlockComment = true;
        line = '';
        break;
      }

      if (blockStart === 0 && blockEnd !== -1) {
        line = line.slice(blockEnd + 2).trim();
        continue;
      }

      if (blockStart > 0 && blockEnd === -1) {
        line = line.slice(0, blockStart).trim();
        inBlockComment = true;
        break;
      }

      if (blockStart > 0 && blockEnd !== -1) {
        line = `${line.slice(0, blockStart)} ${line.slice(blockEnd + 2)}`.trim();
      }
    }

    if (line.length > 0) {
      count += 1;
    }
  }

  return count;
}

function normalize(p) {
  return p.split(path.sep).join('/');
}

const root = process.cwd();
const violations = [];
const staleAllowlistEntries = [];

for (const sourceDir of SOURCE_DIRS) {
  const fullSourceDir = path.join(root, sourceDir);
  const files = collectFiles(fullSourceDir);

  for (const filePath of files) {
    const relativePath = normalize(path.relative(root, filePath));
    if (shouldIgnore(relativePath)) continue;

    const content = readFileSync(filePath, 'utf8');
    const effectiveLines = countEffectiveLines(content);

    if (effectiveLines > MAX_LINES) {
      if (LEGACY_ALLOWLIST.has(relativePath)) {
        continue;
      }

      violations.push({ path: relativePath, lines: effectiveLines });
      continue;
    }

    if (LEGACY_ALLOWLIST.has(relativePath)) {
      staleAllowlistEntries.push({ path: relativePath, lines: effectiveLines });
    }
  }
}

if (staleAllowlistEntries.length > 0) {
  console.warn('[max-lines] The following allowlisted files are now below the limit and can be removed from LEGACY_ALLOWLIST:');
  for (const item of staleAllowlistEntries) {
    console.warn(`  - ${item.path} (${item.lines})`);
  }
}

if (violations.length > 0) {
  console.error(`[max-lines] Found ${violations.length} file(s) over ${MAX_LINES} effective lines:`);
  for (const item of violations.sort((a, b) => b.lines - a.lines)) {
    console.error(`  - ${item.path}: ${item.lines}`);
  }
  process.exit(1);
}

console.log(`[max-lines] OK - no non-allowlisted files exceed ${MAX_LINES} effective lines.`);
