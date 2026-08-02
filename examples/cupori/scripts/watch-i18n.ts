import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.join(import.meta.dir, '..');
const messagesDirectory = path.join(root, 'messages');
const settingsPath = path.join(root, 'project.inlang', 'settings.json');

async function readInputSnapshot() {
  const messageFiles = (await readdir(messagesDirectory))
    .filter((name) => name.endsWith('.json'))
    .sort();
  const inputs: Array<readonly [name: string, filePath: string]> = [
    ['project.inlang/settings.json', settingsPath],
    ...messageFiles.map((name): readonly [string, string] => [
      `messages/${name}`,
      path.join(messagesDirectory, name),
    ]),
  ];
  const contents = await Promise.all(
    inputs.map(async ([name, filePath]) => {
      return `${name}\0${await readFile(filePath, 'utf8')}`;
    }),
  );

  return contents.join('\0');
}

async function compile() {
  const process = Bun.spawn(['bun', 'run', 'i18n:compile'], {
    cwd: root,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });

  return await process.exited;
}

let snapshot = await readInputSnapshot();
await compile();
console.log('[i18n] Watching project settings and message files...');

while (true) {
  await Bun.sleep(300);

  try {
    const nextSnapshot = await readInputSnapshot();
    if (nextSnapshot === snapshot) continue;

    snapshot = nextSnapshot;
    console.log('[i18n] Inputs changed, recompiling...');
    await compile();
  } catch (error) {
    console.error('[i18n] Failed to read localization inputs.', error);
  }
}
