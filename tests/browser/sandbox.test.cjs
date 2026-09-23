const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'output/playwright');
const manifest = require('../../package.json');
const compose = (...args) =>
  execFileSync('docker', ['compose', 'exec', '-T', 'editor', ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15000,
  });
const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

test(
  'installed Linux VSIX: manual-script Enter, text, cursor, undo, identity, and logs',
  { timeout: 120000 },
  async (t) => {
    fs.mkdirSync(output, { recursive: true });
    const original = fs.readFileSync(path.join(root, 'tests/manual_indent_tests.R'), 'utf8');
    compose(
      'cp',
      '/opt/rstudio-indent/examples/manual_indent_tests.R',
      '/home/coder/workspace/sandbox-smoke.R',
    );
    const installed = compose(
      'code-server',
      '--extensions-dir',
      '/home/coder/extensions',
      '--list-extensions',
      '--show-versions',
    );
    assert.ok(
      installed
        .toLowerCase()
        .split(/\r?\n/)
        .includes(`${manifest.publisher}.${manifest.name}@${manifest.version}`.toLowerCase()),
    );
    const browser = await chromium.launch({ headless: process.env.HEADED !== '1' });
    t.signal.addEventListener('abort', () => void browser.close(), { once: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.tracing.start({ screenshots: true, snapshots: true });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    try {
      await page.goto(
        process.env.RSTUDIO_INDENT_URL || 'http://127.0.0.1:8788/?folder=/home/coder/workspace',
      );
      await page.getByRole('treeitem', { name: 'sandbox-smoke.R', exact: true }).dblclick();
      const editor = page.getByRole('textbox', { name: 'sandbox-smoke.R', exact: true });
      await editor.waitFor({ state: 'attached' });
      await page
        .getByRole('button', {
          name: 'RStudio Indent: On, RStudio Indent — show local diagnostic logs',
          exact: true,
        })
        .waitFor();
      const lines = original.split('\n');
      const index = lines.findIndex((line) => line.trim() === 'strtoi("5",');
      assert.ok(index >= 0);
      await editor.press(mod + '+Home');
      for (let i = 0; i < index; i++) await editor.press('ArrowDown');
      await editor.press('End');
      await editor.press('Enter');
      // This is the actual Enter keybinding, not a direct engine or extension command call.
      await page.getByRole('button', { name: `Ln ${index + 2}, Col 8`, exact: true }).waitFor();
      await editor.press(mod + '+s');
      const expected = [...lines.slice(0, index + 1), '       ', ...lines.slice(index + 1)].join(
        '\n',
      );
      // Read the saved container file to check every character, including invisible whitespace.
      await assertEventually(() =>
        assert.equal(compose('cat', '/home/coder/workspace/sandbox-smoke.R'), expected),
      );
      await page.screenshot({ path: path.join(output, 'sandbox-editor.png') });
      await editor.press(mod + '+z');
      await editor.press(mod + '+s');
      await assertEventually(() =>
        assert.equal(compose('cat', '/home/coder/workspace/sandbox-smoke.R'), original),
      );
      const fixtureNames = new Set([
        'native pipe',
        'manual strtoi parameter',
        'block call',
        'nested theme',
        'completed pipe',
        'immediate call',
        'middle argument',
        'before matching close',
      ]);
      const fixtures = require('../fixtures/indentation.cjs').filter(([name]) =>
        fixtureNames.has(name),
      );
      let scenarioNumber = 0;
      async function openFixture(source) {
        const name = `sandbox-case-${scenarioNumber++}.R`;
        execFileSync(
          'docker',
          ['compose', 'exec', '-T', 'editor', 'sh', '-c', `cat > /home/coder/workspace/${name}`],
          { cwd: root, input: source, encoding: 'utf8', timeout: 15000 },
        );
        await page.getByRole('treeitem', { name, exact: true }).dblclick();
        const input = page.getByRole('textbox', { name, exact: true });
        await input.waitFor({ state: 'attached' });
        const sourceLines = source.split('\n');
        for (let i = 0; i < sourceLines.length; i++) await input.press('ArrowDown');
        await input.press('End');
        await page
          .getByRole('button', {
            name: `Ln ${sourceLines.length}, Col ${sourceLines.at(-1).length + 1}`,
            exact: true,
          })
          .waitFor();
        return { input, savedText: () => compose('cat', `/home/coder/workspace/${name}`) };
      }
      for (const [name, code, width] of fixtures) {
        await t.test('Enter key: ' + name, async () => {
          const marker = code.indexOf('|CURSOR|');
          const source = code.replace('|CURSOR|', '');
          const offset = marker < 0 ? source.length : marker;
          const { input, savedText } = await openFixture(source);
          for (let i = source.length; i > offset; i--) await input.press('ArrowLeft');
          await input.press('Enter');
          const before = source.slice(0, offset);
          const expectedText =
            before + '\n' + ' '.repeat(width) + source.slice(offset).replace(/^[\t ]*/, '');
          await page
            .getByRole('button', {
              name: `Ln ${before.split('\n').length + 1}, Col ${width + 1}`,
              exact: true,
            })
            .waitFor();
          await input.press(mod + '+s');
          await assertEventually(() => assert.equal(savedText(), expectedText));
        });
      }
      await t.test('actual closing key triggers on-type formatting', async () => {
        const { input, savedText } = await openFixture('f(\n  x\n    ');
        await input.press(')');
        await page.getByRole('button', { name: 'Ln 3, Col 2', exact: true }).waitFor();
        await input.press(mod + '+s');
        await assertEventually(() => assert.equal(savedText(), 'f(\n  x\n)'));
      });
      await t.test('selection Enter delegates to the editor', async () => {
        const { input, savedText } = await openFixture('abc');
        await input.press(mod + '+a');
        await input.press('Enter');
        await input.press(mod + '+s');
        await assertEventually(() => assert.equal(savedText(), '\n'));
      });
      assert.equal(compose('cat', '/home/coder/workspace/sandbox-smoke.R'), original);
      await page
        .getByRole('button', {
          name: 'RStudio Indent: On, RStudio Indent — show local diagnostic logs',
          exact: true,
        })
        .click();
      await page.getByRole('tab', { name: /^Output/ }).waitFor();
      await page.screenshot({ path: path.join(output, 'sandbox-logs.png') });
      console.log(`Completed browser checks for installed RStudio Indent ${manifest.version}.`);
    } catch (error) {
      if (!page.isClosed()) {
        fs.writeFileSync(
          path.join(output, 'failure-aria.txt'),
          await page.locator('body').ariaSnapshot(),
        );
        await page.screenshot({ path: path.join(output, 'failure.png') });
      }
      throw error;
    } finally {
      // A test timeout may already have closed the browser; still complete cleanup.
      await context.tracing.stop({ path: path.join(output, 'sandbox-trace.zip') }).catch(() => {});
      await browser.close();
    }
  },
);
async function assertEventually(check) {
  const deadline = Date.now() + 5000;
  for (;;) {
    try {
      return check();
    } catch (error) {
      if (Date.now() > deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
