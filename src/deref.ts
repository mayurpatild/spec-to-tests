import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';

/** Load a JSON or YAML document from a URL or file path. */
export async function loadDocument(source: string): Promise<any> {
  let text: string;
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source, { headers: { Accept: 'application/json, application/yaml;q=0.9' } });
    if (!res.ok) throw new Error(`Failed to fetch spec: ${res.status} ${source}`);
    text = await res.text();
  } else {
    text = await readFile(source, 'utf8');
  }
  try { return JSON.parse(text); } catch { return parseYaml(text); }
}

/**
 * Resolve local `$ref` pointers (`#/components/...`) in place.
 * Cycles are left as `{ $circular: '<ref>' }` so JSON.stringify never explodes.
 */
export function dereference<T = any>(doc: T): T {
  const root = doc as any;
  const cache = new Map<string, any>();

  function lookup(ref: string): any {
    if (cache.has(ref)) return cache.get(ref);
    if (!ref.startsWith('#/')) throw new Error(`Only local $ref is supported, got ${ref}`);
    const target = ref.slice(2).split('/').map(s => s.replace(/~1/g, '/').replace(/~0/g, '~'))
      .reduce((o, k) => (o == null ? undefined : o[k]), root);
    if (target === undefined) throw new Error(`Unresolvable $ref ${ref}`);
    cache.set(ref, target);
    return target;
  }

  function walk(node: any, stack: Set<string>): any {
    if (Array.isArray(node)) return node.map(n => walk(n, stack));
    if (node && typeof node === 'object') {
      if (typeof node.$ref === 'string') {
        const ref = node.$ref;
        if (stack.has(ref)) return { $circular: ref };
        const next = new Set(stack); next.add(ref);
        return walk(lookup(ref), next);
      }
      const out: any = {};
      for (const [k, v] of Object.entries(node)) out[k] = walk(v, stack);
      return out;
    }
    return node;
  }

  return walk(root, new Set());
}
