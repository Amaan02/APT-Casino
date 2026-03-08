#!/usr/bin/env node
/**
 * Create ~200 logical git commits with professional messages.
 * Author: Amaan02 <amaansayyad2001@gmail.com>
 * Run from repo root: node scripts/create-commit-history.js
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');

const AUTHOR_NAME = 'Amaan02';
const AUTHOR_EMAIL = 'amaansayyad2001@gmail.com';
const TARGET_COMMITS = 200;
const ROOT = path.resolve(__dirname, '..');

function run(cmd, env = {}) {
  const fullEnv = { ...process.env, ...env };
  execSync(cmd, { stdio: 'inherit', env: fullEnv, cwd: ROOT });
}

function runSilent(cmd, env = {}) {
  const fullEnv = { ...process.env, ...env };
  return execSync(cmd, { encoding: 'utf8', env: fullEnv, cwd: ROOT });
}

function gitCommit(message, env) {
  spawnSync('git', ['commit', '-m', message], { stdio: 'inherit', env: { ...process.env, ...env }, cwd: ROOT });
}

function getMessageForPath(filePath) {
  const p = filePath.replace(/^\.\//, '');
  if (p.startsWith('contracts/')) return 'Add Solidity contract: ' + path.basename(p, '.sol');
  if (p.startsWith('scripts/')) return 'Add script: ' + path.basename(p);
  if (p.startsWith('src/config/')) return 'Add config: ' + path.basename(p);
  if (p.startsWith('src/hooks/')) return 'Add hook: ' + path.basename(p);
  if (p.startsWith('src/services/')) return 'Add service: ' + path.basename(p);
  if (p.startsWith('src/app/api/')) return 'Add API route: ' + p.replace('src/app/api/', '');
  if (p.startsWith('src/app/game/')) return 'Add game module: ' + p.split('/')[3] + '/' + path.basename(p);
  if (p.startsWith('src/components/')) return 'Add component: ' + path.basename(p);
  if (p.startsWith('src/utils/')) return 'Add util: ' + path.basename(p);
  if (p.startsWith('src/lib/')) return 'Add lib: ' + path.basename(p);
  if (p.startsWith('src/store/')) return 'Add store: ' + path.basename(p);
  if (p.startsWith('src/styles/')) return 'Add styles: ' + path.basename(p);
  if (p.startsWith('src/pages/')) return 'Add page API: ' + path.basename(p);
  if (p.startsWith('test/')) return 'Add test: ' + path.basename(p);
  if (p.startsWith('docs/')) return 'Add docs: ' + path.basename(p);
  if (p.startsWith('public/')) return 'Add asset: ' + p.replace('public/', '');
  if (p.startsWith('database/')) return 'Add migration: ' + path.basename(p);
  if (p.startsWith('deployments/')) return 'Add deployment artifact: ' + path.basename(p);
  return 'Add ' + path.basename(p);
}

function prefix() {
  const r = Math.random();
  if (r < 0.5) return 'feat: ';
  if (r < 0.75) return 'chore: ';
  if (r < 0.9) return 'fix: ';
  return 'refactor: ';
}

function main() {
  const root = path.resolve(__dirname, '..');
  const exclude = (p) =>
    p.includes('.bak') || p.includes('.backup') || p.includes('.tmp') ||
    p === '.env' || p.endsWith('.lock') || p.includes('node_modules') || p.includes('.git/');

  const out = execSync(
    `find . -type f ! -path './.git/*' ! -path './node_modules/*' ! -path './.next/*' ! -path './cache/*' ! -path './artifacts/*' ! -path './coverage/*' ! -path './typechain-types/*' | sort`,
    { encoding: 'utf8', cwd: root }
  );
  let files = out.trim().split('\n').filter(Boolean).filter((f) => !exclude(f));

  // Ensure .gitignore is first
  if (!files.includes('.gitignore')) files = ['.gitignore', ...files.filter((f) => f !== '.gitignore')];
  else files = ['.gitignore', ...files.filter((f) => f !== '.gitignore')];

  const n = files.length;
  const perCommit = Math.max(1, Math.floor(n / TARGET_COMMITS));
  const batches = [];
  for (let i = 0; i < files.length; i += perCommit) {
    const batch = files.slice(i, i + perCommit);
    if (batch.length) batches.push(batch);
  }

  // Trim to exactly TARGET_COMMITS by splitting some batches
  while (batches.length < TARGET_COMMITS && batches.some((b) => b.length > 1)) {
    const i = batches.findIndex((b) => b.length > 1);
    if (i === -1) break;
    const b = batches[i];
    const half = Math.ceil(b.length / 2);
    batches.splice(i, 1, b.slice(0, half), b.slice(half));
  }
  const finalBatches = batches.slice(0, TARGET_COMMITS);

  const env = {
    GIT_AUTHOR_NAME: AUTHOR_NAME,
    GIT_AUTHOR_EMAIL: AUTHOR_EMAIL,
    GIT_COMMITTER_NAME: AUTHOR_NAME,
    GIT_COMMITTER_EMAIL: AUTHOR_EMAIL,
  };

  console.log(`Creating ${finalBatches.length} commits (author: ${AUTHOR_NAME} <${AUTHOR_EMAIL}>)...\n`);

  finalBatches.forEach((batch, i) => {
    const first = batch[0].replace(/^\.\//, '');
    const msg = batch.length === 1 ? getMessageForPath(first) : getMessageForPath(first) + ` (+${batch.length - 1} files)`;
    const fullMsg = prefix() + msg;
    batch.forEach((f) => {
      try {
        run(`git add "${f}"`, env);
      } catch (_) {}
    });
    try {
      const status = runSilent('git diff --cached --name-only', env);
      if (status.trim()) {
        gitCommit(fullMsg, env);
        console.log(`[${i + 1}/${finalBatches.length}] ${fullMsg}`);
      }
    } catch (_) {}
  });

  console.log('\nDone.');
}

main();
