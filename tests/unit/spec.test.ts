import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadSpec, byTag } from '../../src/spec.js';
import { buildPrompt, stripFences } from '../../src/generate.js';
import { coverageMarkdown } from '../../src/coverage.js';

const fixture = new URL('../../examples/mini-openapi.json', import.meta.url).pathname;
const expect = (v: unknown) => ({
  toBe: (e: unknown) => assert.equal(v, e),
  toEqual: (e: unknown) => assert.deepEqual(v, e),
  toContain: (e: string) => assert.ok(String(v).includes(e), `expected to contain ${e}`),
  toMatchObject: (e: Record<string, unknown>) => { for (const [k, x] of Object.entries(e)) assert.deepEqual((v as any)[k], x); },
});

describe('loadSpec', () => {
  it('flattens paths into operations with kinds and tags', async () => {
    const spec = await loadSpec(fixture);
    expect(spec.title).toBe('Mini Orders API');
    expect(spec.operations.map(o => `${o.method} ${o.path}`)).toEqual(['get /orders', 'post /orders', 'get /orders/{id}', 'delete /orders/{id}']);
    expect(spec.operations.find(o => o.method === 'post')?.kind).toBe('mutating');
    expect(spec.operations.find(o => o.method === 'post')?.requestBody).toMatchObject({ required: ['currency', 'amount'] });
  });
  it('filters by tag and groups', async () => {
    const spec = await loadSpec(fixture, ['orders']);
    expect([...byTag(spec).keys()]).toEqual(['orders']);
  });
  it('hash is stable for the same spec', async () => {
    const [a, b] = await Promise.all([loadSpec(fixture), loadSpec(fixture)]);
    expect(a.hash).toBe(b.hash);
  });
});

describe('generate helpers', () => {
  it('prompt includes operations and responses', async () => {
    const spec = await loadSpec(fixture);
    const p = buildPrompt(spec, 'orders', spec.operations);
    expect(p).toContain('"method": "POST"');
    expect(p).toContain('"201"');
  });
  it('strips markdown fences', () => {
    expect(stripFences('```ts\nconst a = 1;\n```')).toBe('const a = 1;\n');
    expect(stripFences('const a = 1;')).toBe('const a = 1;\n');
  });
});

describe('coverage', () => {
  it('marks generated tags and NA columns', async () => {
    const spec = await loadSpec(fixture);
    const md = coverageMarkdown(spec, new Set(['orders']), 'x.json');
    expect(md).toContain('4/4 operations covered');
    expect(md).toContain('| `GET /orders` | orders | ✓ | – | – | ✓ |');
    expect(md).toContain('| `POST /orders` | orders | ✓ | ✓ | ✓ | ✓ |');
  });
});
