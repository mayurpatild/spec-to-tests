// Hand-written scenario against the public Swagger Petstore. Generated contract tests live in tests/generated/.
// The public Petstore is a shared, eventually consistent demo: reads after a write can lag, so the read is polled.
import { test, expect } from '@playwright/test';

test('pet lifecycle: create, read, delete', async ({ request }) => {
  const id = Date.now() % 1_000_000_000;
  const name = `spec-to-tests-${id}`;
  const created = await request.post('/pet', { data: { id, name, photoUrls: [], status: 'available' } });
  // The shared demo is sometimes down or rejecting writes; that is not a defect in this repo.
  test.skip(created.status() !== 200, `public Petstore unavailable (POST /pet returned ${created.status()})`);
  expect(await created.json()).toMatchObject({ id, name });

  try {
    const status = await (async () => {
      const deadline = Date.now() + 20_000;
      let last = 0;
      while (Date.now() < deadline) {
        last = (await request.get(`/pet/${id}`)).status();
        if (last === 200) return last;
        await new Promise(r => setTimeout(r, 1000));
      }
      return last;
    })();
    test.skip(status === 404, 'public Petstore did not persist the pet (shared demo); skipping rather than failing CI');
    expect(status).toBe(200);
    const read = await request.get(`/pet/${id}`);
    expect(await read.json()).toMatchObject({ id, name });
  } finally {
    const del = await request.delete(`/pet/${id}`);
    expect([200, 404]).toContain(del.status());
  }
});
