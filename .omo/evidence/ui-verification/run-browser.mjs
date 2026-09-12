import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
const log = createWriteStream('.omo/evidence/ui-verification/preview.log');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4187', '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
server.stdout.pipe(log);
server.stderr.pipe(log);
try {
  await new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error('Preview readiness deadline exceeded')), 10000);
    server.once('error', error => { clearTimeout(deadline); reject(error); });
    server.once('exit', code => { clearTimeout(deadline); reject(new Error(`Preview exited ${code}`)); });
    server.stdout.on('data', chunk => { if (chunk.toString().includes('127.0.0.1:4187')) { clearTimeout(deadline); resolve(); } });
  });
  for (const script of ['browser-qa.mjs', 'resize-qa.mjs', 'edge-qa.mjs']) {
    console.log(`RUN ${script}`);
    const child = spawn(process.execPath, [`.omo/evidence/ui-verification/${script}`], { stdio: 'inherit' });
    const [code] = await once(child, 'exit');
    if (code !== 0) throw new Error(`${script} exited ${code}`);
    console.log(`PASS ${script}`);
  }
} finally {
  const exited = once(server, 'exit');
  server.kill('SIGTERM');
  await exited;
  log.end();
  console.log('Owned preview process terminated.');
}
