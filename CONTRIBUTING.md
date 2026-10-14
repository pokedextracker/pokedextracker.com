# Contributing

Any contribution, big or small, is welcome! If it's a feature, we'd recommend [creating an
issue](https://github.com/pokedextracker/pokedextracker.com/issues/new) for it first so that the implementation can be
decided on before the PR goes up and to make sure no one is working on the same feature. It makes the review process a
bit smoother, so you don't have to keep going back adding things. If it's just a bug fix though, feel free to just put
up the PR directly!

Some guidelines you should follow when submitting a PR:

* We use [`generate-changelog`](https://github.com/lob/generate-changelog) for automatic changelog generation whenever
  we deploy, so please follow the commit message format: `feat(info): add animations when toggling`.
* Ideally, your PR has one commit in it. If you you need to add another one because of a typo or refactor, you should
  squash your commits together. This makes the changelog and commit history much more managable to go through. If you
  need help squashing them, we can always help you out!
* Any API code should have associated tests with it. Though this isn't a mission-critical API, it would be nice if it
  didn't go down every week. Having a well-tested API helps mitigate bugs and downtime. Run the tests with
  `mise test:go`, and you can check coverage against the threshold with `mise test:enforce`.
* Before submitting the PR, you should make sure that your code passes the linters by running `mise lint`.
