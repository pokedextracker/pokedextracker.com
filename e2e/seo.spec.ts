import { createUser, expect, test } from "./fixtures";

// What search engines and link previews see before any JavaScript runs: the
// server puts each page's own title and description in the HTML, and answers
// pages that don't exist with a 404. These tests don't run in production,
// where pages can be indexed, so which pages are is covered by the Go tests.
// The app still shows its not found page on a 404 (see not-found.spec.ts).

test("a profile's HTML has its own title and description", async ({
  request,
}) => {
  const user = await createUser(request);

  const response = await request.get(`/u/${user.username}`);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain(
    `<title>${user.username}&#39;s Profile | Pokédex Tracker</title>`,
  );
  expect(html).toContain(
    `${user.username}&#39;s Living Dex progress on Pokédex Tracker: Living Dex (0/237).`,
  );
  expect(html).toContain('"@type":"ProfilePage"');
  // Google rejects a date on its own here; it needs a full date and time.
  expect(html).toMatch(/"dateCreated":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z"/);
});

test("a dex's HTML has its own title and description", async ({ request }) => {
  const user = await createUser(request);

  const response = await request.get(`/u/${user.username}/${user.slug}`);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain(
    `<title>${user.username}&#39;s Living Dex | Pokédex Tracker</title>`,
  );
  expect(html).toContain(
    `${user.username} has caught 0 of 237 Pokémon (0%) in their Living Dex`,
  );
});

test("pages that don't exist are a 404", async ({ request }) => {
  const user = await createUser(request);

  for (const target of [
    "/this/page/does/not/exist",
    "/u/e2e_nobody",
    `/u/${user.username}/no-such-dex`,
  ]) {
    const response = await request.get(target);
    expect(response.status(), target).toBe(404);
    expect(await response.text(), target).toContain(
      "<title>404 Not Found | Pokédex Tracker</title>",
    );
  }
});

test("pages outside production aren't indexed", async ({ request }) => {
  const html = await (await request.get("/")).text();

  expect(html).toContain('<meta name="robots" content="noindex" />');
});
