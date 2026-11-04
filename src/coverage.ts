import type { LoadedSpec } from './spec.js';

/** Build COVERAGE.md: one row per operation, columns derived from what the generator produces. */
export function coverageMarkdown(spec: LoadedSpec, generatedTags: Set<string>, source: string): string {
  const rows = spec.operations.map(o => {
    const gen = generatedTags.has(o.tag);
    const y = gen ? '✓' : 'TODO';
    const mut = o.kind === 'mutating';
    return `| \`${o.method.toUpperCase()} ${o.path}\` | ${o.tag} | ${y} | ${mut ? y : '–'} | ${mut && o.requestBody ? y : '–'} | ${o.security ? y : '–'} |`;
  });
  const total = spec.operations.length;
  const covered = spec.operations.filter(o => generatedTags.has(o.tag)).length;
  return [
    `# Coverage — ${spec.title} v${spec.version}`,
    '',
    `Source: ${source} · spec hash \`${spec.hash}\` · ${covered}/${total} operations covered · generated ${new Date().toISOString().slice(0, 10)}`,
    '',
    '| Operation | Tag | Contract | Happy path | Validation | Auth |',
    '|---|---|---|---|---|---|',
    ...rows,
    '',
    '`–` not applicable · `TODO` tag not generated yet (pass it with `--tags`).',
    '',
  ].join('\n');
}
