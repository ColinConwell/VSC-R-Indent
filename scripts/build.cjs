const { rmSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
rmSync('out', { recursive: true, force: true });
const result = spawnSync(
  process.execPath,
  [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.json'],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
