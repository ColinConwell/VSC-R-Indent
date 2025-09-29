import * as cp from 'child_process';

export interface AirRunOptions {
  executablePath?: string;
  cwd?: string;
  timeoutMs?: number;
}

export class AirRunner {
  static formatSliceSync(
    code: string,
    options: AirRunOptions
  ): string | null {
    try {
      const exe = options.executablePath || 'air';
      const args = ['format', '-', '--no-color'];
      const res = cp.spawnSync(exe, args, {
        cwd: options.cwd,
        input: code,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
        timeout: options.timeoutMs ?? 250,
      } as any);
      if (res.status === 0 && typeof res.stdout === 'string') {
        return res.stdout as string;
      }
      return null;
    } catch {
      return null;
    }
  }

  static async formatSlice(
    code: string,
    options: AirRunOptions
  ): Promise<string | null> {
    const exe = options.executablePath || 'air';
    const args = ['format', '-', '--no-color'];
    return new Promise((resolve) => {
      const p = cp.spawn(exe, args, { cwd: options.cwd });
      let stdout = '';
      let stderr = '';
      let finished = false;

      p.stdout.setEncoding('utf8');
      p.stdout.on('data', (d) => (stdout += d));
      p.stderr.setEncoding('utf8');
      p.stderr.on('data', (d) => (stderr += d));
      p.on('error', () => {
        if (!finished) {
          finished = true;
          resolve(null);
        }
      });
      p.on('close', (code) => {
        if (!finished) {
          finished = true;
          if (code === 0) resolve(stdout);
          else resolve(null);
        }
      });

      p.stdin.write(code);
      p.stdin.end();

      const timeout = options.timeoutMs ?? 300;
      setTimeout(() => {
        if (!finished) {
          try { p.kill(); } catch {}
          resolve(null);
        }
      }, timeout);
    });
  }
}


