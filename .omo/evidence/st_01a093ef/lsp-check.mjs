import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const directory = `${process.cwd()}/src/graphics`;
const files = (await readdir(directory)).filter(file => /\.tsx?$/.test(file));
const child = spawn('node', ['node_modules/typescript/bin/tsc', '--lsp', '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'] });
let buffer = Buffer.alloc(0);
let id = 0;
const requests = new Map();
const diagnostics = new Map();
let complete;
const done = new Promise(resolve => { complete = resolve; });
const timeout = setTimeout(() => { console.error('LSP_TIMEOUT', [...diagnostics.keys()]); child.kill(); process.exitCode = 1; complete(); }, 30000);
function send(method, params, request = false) {
  const message = { jsonrpc: '2.0', method, params, ...(request ? { id: ++id } : {}) };
  const text = JSON.stringify(message);
  child.stdin.write(`Content-Length: ${Buffer.byteLength(text)}\r\n\r\n${text}`);
  return request ? new Promise(resolve => requests.set(message.id, resolve)) : undefined;
}
child.stdout.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  for (;;) {
    const boundary = buffer.indexOf('\r\n\r\n');
    if (boundary === -1) return;
    const length = Number(/Content-Length: (\d+)/i.exec(buffer.subarray(0, boundary).toString())?.[1]);
    if (buffer.length < boundary + 4 + length) return;
    const message = JSON.parse(buffer.subarray(boundary + 4, boundary + 4 + length).toString());
    buffer = buffer.subarray(boundary + 4 + length);
    if (message.method !== 'textDocument/publishDiagnostics') console.log('LSP_MESSAGE', JSON.stringify(message));
    if (message.id && message.method) {
      const text = JSON.stringify({ jsonrpc: '2.0', id: message.id, result: message.method === 'workspace/configuration' ? message.params.items.map(() => null) : null });
      child.stdin.write(`Content-Length: ${Buffer.byteLength(text)}\r\n\r\n${text}`);
    }
    if (message.id && requests.has(message.id)) { requests.get(message.id)(message); requests.delete(message.id); }
    if (message.method === 'textDocument/publishDiagnostics' && message.params.uri.includes('/src/graphics/')) {
      diagnostics.set(message.params.uri, message.params.diagnostics);
      if (diagnostics.size === files.length) complete();
    }
  }
});
child.stderr.on('data', chunk => process.stderr.write(chunk));
await send('initialize', { processId: process.pid, rootUri: pathToFileURL(process.cwd()).href, capabilities: { textDocument: { diagnostic: { dynamicRegistration: false, relatedDocumentSupport: true } } } }, true);
send('initialized', {});
for (const file of files) send('textDocument/didOpen', { textDocument: { uri: pathToFileURL(`${directory}/${file}`).href, languageId: file.endsWith('.tsx') ? 'typescriptreact' : 'typescript', version: 1, text: await readFile(`${directory}/${file}`, 'utf8') } });
for (const file of files) {
  const uri = pathToFileURL(`${directory}/${file}`).href;
  const response = await send('textDocument/diagnostic', { textDocument: { uri } }, true);
  if (response.error) throw new Error(JSON.stringify(response.error));
  diagnostics.set(uri, response.result.items);
}
clearTimeout(timeout);
for (const [uri, values] of diagnostics) console.log(JSON.stringify({ file: uri.split('/').at(-1), diagnostics: values }));
console.log(`LSP_FILES=${diagnostics.size} LSP_ERRORS=${[...diagnostics.values()].flat().filter(value => value.severity === 1).length}`);
await send('shutdown', undefined, true); send('exit', undefined); child.stdin.end();
