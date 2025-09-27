import * as path from 'path';
import { runTests, downloadAndUnzipVSCode } from '@vscode/test-electron';

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, './suite');

    // Ensure VS Code is available (cached by the runner)
    await downloadAndUnzipVSCode('stable');

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ['--disable-extensions'],
      version: 'stable',
    });
  } catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

main();


