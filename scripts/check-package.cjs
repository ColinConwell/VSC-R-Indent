const { spawnSync } = require('node:child_process');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const p = require('../package.json');
assert.equal(p.name, 'rstudio-indent');
assert.equal(p.publisher, 'ColinConwell');
assert.equal(p.author.name, 'Colin Conwell');
assert.ok(existsSync(p.main), 'Compile before validating package');
assert.ok(existsSync('package-lock.json'), 'Lockfile must exist');
const lock = JSON.parse(readFileSync('package-lock.json'));
assert.equal(lock.packages[''].license, p.license);
const r = spawnSync(
  process.execPath,
  [require.resolve('@vscode/vsce/vsce'), 'ls', '--no-dependencies'],
  { encoding: 'utf8' },
);
assert.equal(r.status, 0, r.stderr);
const files = r.stdout.trim().split(/\r?\n/);
const roots = new Set(['package.json', 'README.md', 'CHANGELOG.md', 'LICENSE', 'R-Indent.png']);
for (const file of files)
  assert.ok(
    (file.startsWith('out/') && file.endsWith('.js')) || roots.has(file),
    `Unexpected package file: ${file}`,
  );
for (const required of [...roots, 'out/extension.js'])
  assert.ok(files.includes(required), `Missing ${required}`);
// Resolve every relative require with exact case even on a case-insensitive filesystem.
for (const file of files.filter((f) => f.endsWith('.js'))) {
  for (const match of readFileSync(file, 'utf8').matchAll(/require\(["'](\.[^"']+)["']\)/g)) {
    const target = path.normalize(
      path.join(path.dirname(file), match[1] + (match[1].endsWith('.js') ? '' : '.js')),
    );
    assert.ok(
      files.includes(target.split(path.sep).join('/')),
      `Wrong case or missing packaged import: ${file} -> ${target}`,
    );
  }
}
console.log(`Validated ${files.length} allowlisted package files and exact-case imports.`);
