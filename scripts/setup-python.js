#!/usr/bin/env node
/**
 * Creates a portable Python venv (with --copies for Vercel/Lambda) and installs
 * python-chess. Runs on postinstall so the venv exists before `next build`.
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const venvDir = path.join(root, 'venv');
const venvPython = path.join(venvDir, 'bin', 'python');
const requirements = path.join(root, 'requirements.txt');
const isVercel = process.env.VERCEL === '1';

function run(cmd, options = {}) {
  execSync(cmd, { cwd: root, stdio: 'inherit', ...options });
}

function venvIsReady() {
  if (!fs.existsSync(venvPython)) return false;
  const check = spawnSync(venvPython, ['-c', 'import chess'], {
    cwd: root,
    stdio: 'ignore',
  });
  return check.status === 0;
}

function resolvePython3() {
  for (const cmd of ['python3', 'python']) {
    const probe = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
    if (probe.status === 0) return cmd;
  }
  return null;
}

if (venvIsReady()) {
  console.log('[setup-python] venv already configured with python-chess');
  process.exit(0);
}

const python3 = resolvePython3();
if (!python3) {
  const message =
    '[setup-python] python3 not found. Install Python 3.10+ or run: python3 -m venv venv && venv/bin/pip install -r requirements.txt';
  if (isVercel) {
    console.error(message);
    process.exit(1);
  }
  console.warn(message);
  process.exit(0);
}

console.log('[setup-python] Creating portable virtual environment...');
run(`${python3} -m venv venv --copies`);
run('venv/bin/pip install --upgrade pip');
run('venv/bin/pip install -r requirements.txt');

if (!venvIsReady()) {
  console.error('[setup-python] Failed to configure python-chess in venv');
  process.exit(1);
}

console.log('[setup-python] Done');
