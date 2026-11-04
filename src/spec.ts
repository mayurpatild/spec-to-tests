import { loadDocument, dereference } from './deref.js';
import { createHash } from 'node:crypto';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface Operation {
  id: string;              // operationId or method+path
  method: Method;
  path: string;
  tag: string;
  summary: string;
  params: Array<{ name: string; in: string; required: boolean; schema: unknown }>;
  requestBody?: unknown;   // JSON schema (resolved)
  responses: Record<string, unknown>; // status -> JSON schema or {}
  security: boolean;
  kind: 'reference' | 'mutating';
}

export interface LoadedSpec {
  title: string;
  version: string;
  hash: string;
  servers: string[];
  operations: Operation[];
}

const METHODS: Method[] = ['get', 'post', 'put', 'patch', 'delete'];

/** Load, dereference and flatten an OpenAPI 3 spec into a list of operations. */
export async function loadSpec(source: string, tags?: string[]): Promise<LoadedSpec> {
  const api = dereference(await loadDocument(source));
  const raw = JSON.stringify(api);
  const hash = createHash('sha256').update(raw).digest('hex').slice(0, 12);
  const ops: Operation[] = [];

  for (const [path, item] of Object.entries<any>(api.paths ?? {})) {
    for (const method of METHODS) {
      const op = item[method];
      if (!op) continue;
      const tag = op.tags?.[0] ?? 'default';
      if (tags?.length && !tags.includes(tag)) continue;
      const responses: Record<string, unknown> = {};
      for (const [status, r] of Object.entries<any>(op.responses ?? {})) {
        responses[status] = r?.content?.['application/json']?.schema ?? {};
      }
      ops.push({
        id: op.operationId ?? `${method}_${path.replace(/[^a-z0-9]+/gi, '_')}`,
        method, path, tag,
        summary: op.summary ?? '',
        params: [...(item.parameters ?? []), ...(op.parameters ?? [])].map((p: any) => ({
          name: p.name, in: p.in, required: !!p.required, schema: p.schema,
        })),
        requestBody: op.requestBody?.content?.['application/json']?.schema,
        responses,
        security: !!(op.security ?? api.security)?.length,
        kind: method === 'get' ? 'reference' : 'mutating',
      });
    }
  }

  return {
    title: api.info?.title ?? 'API',
    version: api.info?.version ?? '0',
    hash,
    servers: (api.servers ?? []).map((s: any) => s.url),
    operations: ops,
  };
}

/** Group operations by tag so each tag becomes one spec file. */
export function byTag(spec: LoadedSpec): Map<string, Operation[]> {
  const m = new Map<string, Operation[]>();
  for (const op of spec.operations) m.set(op.tag, [...(m.get(op.tag) ?? []), op]);
  return m;
}
