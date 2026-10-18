# Contributing

Any contribution, big or small, is welcome! If it's a feature, we'd recommend [creating an
issue](https://github.com/pokedextracker/pokedextracker.com/issues/new) for it first so that the implementation can be
decided on before the PR goes up and to make sure no one is working on the same feature. It makes the review process a
bit smoother, so you don't have to keep going back adding things. If it's just a bug fix though, feel free to just put
up the PR directly!

If you've found incorrect Pokémon data, like a wrong location or a missing evolution, please open an issue instead of a
PR. The files in `seeds/` are a copy of the production database for local development, so changing them doesn't change
the site. See [`seeds/README.md`](seeds/README.md).

Some guidelines you should follow when submitting a PR:

* PRs are squash merged, so the PR title becomes the commit message. Titles should follow the format
  `[Category] Change description`, for example `[Frontend] Add dark mode toggle to settings page`. Use `[Frontend]`,
  `[Backend]`, or `[Feature]` for features, `[Fix]` for bug fixes, `[Docs]` for documentation, `[Test]` or `[E2E]` for
  tests, and `[CI]` or `[CD]` for CI/CD changes.
* Any API code should have associated tests with it. Though this isn't a mission-critical API, it would be nice if it
  didn't go down every week. Having a well-tested API helps mitigate bugs and downtime. Run the tests with
  `mise test:go`, and you can check coverage against the threshold with `mise test:enforce`.
* Changes to how the site works should keep the end-to-end tests passing. Run them with `mise test:e2e`, and add a test
  in `e2e/` for new pages or flows. CI runs them in Chromium, Firefox, and WebKit.
* Before submitting the PR, you should make sure that your code passes the linters by running `mise lint`.
