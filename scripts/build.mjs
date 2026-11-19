import { copyFile, mkdir, readdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
const assets = ['index.html', 'public/styles.css', 'public/app.js', 'public/model.js'];
await mkdir(output, { recursive: true });
// Reject stale/unexpected files instead of publishing an entire repository tree.
const existing = await readdir(output, { recursive: true, withFileTypes: true });
for (const entry of existing) {
  if (entry.isSymbolicLink()) throw new Error('Links simbólicos não são permitidos na saída pública.');
}
const { relative, sep } = await import('node:path');
const { fileURLToPath } = await import('node:url');
for (const entry of existing.filter(entry => !entry.isDirectory())) {
  const name = relative(fileURLToPath(output), `${entry.parentPath}${sep}${entry.name}`).split(sep).join('/');
  if (!assets.includes(name)) throw new Error('Arquivo inesperado na saída pública. Use uma pasta dist limpa.');
}
await mkdir(new URL('public/', output), { recursive: true });
for (const asset of assets) await copyFile(new URL(asset, root), new URL(asset, output));
console.log('Build concluído: quatro arquivos públicos, sem chaves ou código do servidor.');
