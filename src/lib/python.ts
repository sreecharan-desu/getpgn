import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

/**
 * Resolves the Python interpreter and the chess validation script.
 *
 * Priority order for the interpreter:
 *   1. venv/bin/python  (local dev — already has python-chess installed)
 *   2. venv/bin/python3 (same)
 *   3. System python3   (Vercel / CI — python-chess is in .python_packages/)
 *   4. System python    (last resort)
 *
 * When a system interpreter is used the caller must set PYTHONPATH so that
 * packages installed with `pip install --target=.python_packages` are found.
 * `getChessValidatorPaths()` returns the required `env` object for that.
 */
export function getChessValidatorPaths(): {
  pythonPath: string;
  scriptPath: string;
  env: NodeJS.ProcessEnv;
} {
  const root = process.cwd();
  const scriptPath = path.join(root, 'scripts', 'validate_chess.py');

  // --- locate interpreter ---------------------------------------------------
  const venvCandidates = [
    path.join(root, 'venv', 'bin', 'python'),
    path.join(root, 'venv', 'bin', 'python3'),
  ];

  // Check for a local venv first (preferred in local dev)
  let pythonPath: string | undefined = venvCandidates.find((c) =>
    fs.existsSync(c)
  );

  // Fall back to system python3 / python (available on Vercel runtime)
  if (!pythonPath) {
    for (const cmd of ['python3', 'python']) {
      try {
        execFileSync(cmd, ['--version'], { stdio: 'ignore' });
        pythonPath = cmd;
        break;
      } catch {
        // not found in PATH, try next
      }
    }
  }

  if (!pythonPath) {
    throw new Error(
      'No Python interpreter found. ' +
        'Locally: run `npm run setup:python` to create a venv. ' +
        'On Vercel: ensure pip3 install --target=.python_packages ran during build.'
    );
  }

  // --- validate script exists -----------------------------------------------
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Chess validation script not found at ${scriptPath}`);
  }

  // --- build env for subprocess ---------------------------------------------
  // When using the venv interpreter, python-chess is already on sys.path.
  // When using a system interpreter, we prepend .python_packages to PYTHONPATH
  // so packages installed via `pip install --target` are importable.
  const isVenv = pythonPath.includes('venv');
  const packagesDir = path.join(root, '.python_packages');

  const env: NodeJS.ProcessEnv = { ...process.env };
  if (!isVenv && fs.existsSync(packagesDir)) {
    const existing = env.PYTHONPATH ?? '';
    env.PYTHONPATH = existing ? `${packagesDir}:${existing}` : packagesDir;
  }

  return { pythonPath, scriptPath, env };
}
