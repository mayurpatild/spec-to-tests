// Hand-written scenario against the public Swagger Petstore. Generated contract tests live in tests/generated/.
// The public Petstore is a shared, eventually consistent demo: reads after a write can lag, so the read is polled.
import { test, expect } from '@playwright/test';

test('pet lifecycle: create, read, delete', async ({ request }) => {
  const id = Date.now() % 1_000_000_000;
  const name = `spec-to-tests-${id}`;
  const created = await request.post('/pet', { data: { id, name, photoUrls: [], status: 'available' } });
  expect(created.status()).toBe(200);
  expect(await created.json()).toMatchObject({ id, name });

  try {
    await expect
      .poll(async () => (await request.get(`/pet/${id}`)).status(), { timeout: 15_000, message: 'pet becomes readable' })
      .toBe(200);
    const read = await request.get(`/pet/${id}`);
    expect(await read.json()).toMatchObject({ id, name });
  } finally {
    const del = await request.delete(`/pet/${id}`);
    expect([200, 404]).toContain(del.status());
  }
});
