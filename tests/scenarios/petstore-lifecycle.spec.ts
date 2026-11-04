// Hand-written scenario against the public Swagger Petstore. Generated contract tests live in tests/generated/.
import { test, expect } from '@playwright/test';

test('pet lifecycle: create, read, delete', async ({ request }) => {
  const id = Date.now() % 1_000_000_000;
  const created = await request.post('/pet', { data: { id, name: `spec-to-tests-${id}`, photoUrls: [], status: 'available' } });
  expect(created.status()).toBe(200);
  try {
    const read = await request.get(`/pet/${id}`);
    expect(read.status()).toBe(200);
    expect(await read.json()).toMatchObject({ id, name: `spec-to-tests-${id}` });
  } finally {
    const del = await request.delete(`/pet/${id}`);
    expect([200, 404]).toContain(del.status());
  }
});
