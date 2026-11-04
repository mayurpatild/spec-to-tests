import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dereference } from '../../src/deref.js';

describe('dereference', () => {
  it('resolves nested local refs', () => {
    const doc = { components: { schemas: { A: { type: 'object', properties: { b: { $ref: '#/components/schemas/B' } } }, B: { type: 'string' } } }, x: { $ref: '#/components/schemas/A' } };
    const out = dereference(doc);
    assert.deepEqual(out.x.properties.b, { type: 'string' });
  });
  it('marks cycles instead of recursing forever', () => {
    const doc = { components: { schemas: { Node: { type: 'object', properties: { next: { $ref: '#/components/schemas/Node' } } } } }, x: { $ref: '#/components/schemas/Node' } };
    const out = dereference(doc);
    assert.deepEqual(out.x.properties.next, { $circular: '#/components/schemas/Node' });
    assert.ok(JSON.stringify(out));
  });
  it('throws on an unknown ref', () => {
    assert.throws(() => dereference({ x: { $ref: '#/nope' } }), /Unresolvable/);
  });
});
