#!/usr/bin/env node
import { Command } from 'commander';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadSpec, byTag } from './spec.js';
import { generateTagFile, header } from './generate.js';
import { coverageMarkdown } from './coverage.js';

const program = new Command().name('spec-to-tests').description('Generate Playwright API tests from an OpenAPI spec with Claude');

program.command('generate')
  .requiredOption('--spec <urlOrFile>', 'OpenAPI 3 spec (URL or path)')
  .option('--out <dir>', 'output directory', 'tests/generated')
  .option('--tags <list>', 'comma-separated tags to generate (default: all)')
  .option('--force', 'regenerate even if the spec hash is unchanged', false)
  .action(async (o) => {
    const tags = o.tags ? String(o.tags).split(',').map((s: string) => s.trim()) : undefined;
    const spec = await loadSpec(o.spec, tags);
    await mkdir(o.out, { recursive: true });

    const stampPath = join(o.out, '.spec-hash');
    const prev = existsSync(stampPath) ? (await readFile(stampPath, 'utf8')).trim() : '';
    if (prev === spec.hash && !o.force) {
      console.log(`Spec unchanged (${spec.hash}); nothing to do. Use --force to regenerate.`);
      return;
    }

    const groups = byTag(spec);
    const done = new Set<string>();
    for (const [tag, ops] of groups) {
      process.stdout.write(`Generating ${tag} (${ops.length} operations)… `);
      const body = await generateTagFile({ spec, tag, ops });
      await writeFile(join(o.out, `${tag}.spec.ts`), header(spec, o.spec) + body);
      done.add(tag);
      console.log('ok');
    }
    await writeFile(join(o.out, 'COVERAGE.md'), coverageMarkdown(spec, done, o.spec));
    await writeFile(stampPath, spec.hash + '\n');
    console.log(`Wrote ${done.size} files + COVERAGE.md to ${o.out}`);
  });

program.command('inspect')
  .requiredOption('--spec <urlOrFile>')
  .action(async (o) => {
    const spec = await loadSpec(o.spec);
    console.log(`${spec.title} v${spec.version} (${spec.hash}) — ${spec.operations.length} operations`);
    for (const [tag, ops] of byTag(spec)) console.log(`  ${tag}: ${ops.map(x => `${x.method.toUpperCase()} ${x.path}`).join(', ')}`);
  });

program.parseAsync();
