# spec-to-tests

Generate Playwright API tests from an OpenAPI spec with Claude, and keep them in sync as the spec changes.

```
openapi.json ──▶ flatten operations ──▶ Claude (one file per tag) ──▶ tests/generated/*.spec.ts
                                                                  └──▶ COVERAGE.md
```

Most "AI writes tests" demos produce a file once and never again. This tool is built for the second week: it hashes the spec, regenerates only when the spec changes, typechecks the output, runs it, and opens a pull request with the diff. Hand-written scenarios live in a separate folder and are never touched.

## Quick start

```bash
npm install
cp .env.example .env            # set ANTHROPIC_API_KEY
npm run generate:petstore       # public Swagger Petstore, tags pet + store
npx playwright test             # runs generated + scenario tests against the live Petstore
```

Any spec:

```bash
npx tsx src/cli.ts inspect  --spec ./openapi.yaml
npx tsx src/cli.ts generate --spec ./openapi.yaml --out tests/generated --tags orders,payments
```

## What gets generated

For each tag, one `tests/generated/<tag>.spec.ts` with:

- a `describe` per operation, titled `METHOD /path`
- one test per documented response status, asserting status and body shape
- for mutating operations: a happy path, one validation test per required field, and an unauthenticated call when the operation needs auth
- cleanup of created IDs in `afterEach`
- `test.fixme` with a reason where the endpoint cannot be exercised without data the generator does not have

Plus `COVERAGE.md`, a matrix of every operation and which test classes exist for it:

| Operation | Tag | Contract | Happy path | Validation | Auth |
|---|---|---|---|---|---|
| `GET /pet/{petId}` | pet | ✓ | – | – | ✓ |
| `POST /pet` | pet | ✓ | ✓ | ✓ | ✓ |

## Keeping tests in sync

`.github/workflows/regenerate.yml` runs on weekday mornings:

1. Re-reads the spec and compares its hash to `tests/generated/.spec-hash`.
2. If unchanged, exits. No noise, no commits.
3. If changed, regenerates with Claude, typechecks, runs the suite, and opens a PR titled *Regenerated API tests (spec changed)* with the diff.

Set `ANTHROPIC_API_KEY` as a repository secret to enable it.

## Layout

```
src/deref.ts       load JSON/YAML from URL or file, resolve local $ref (no swagger-parser dependency)
src/spec.ts        flatten OpenAPI into operations
src/generate.ts    prompt construction and the Claude call
src/coverage.ts    COVERAGE.md
src/cli.ts         generate / inspect commands
tests/generated/   output (committed, so diffs are reviewable)
tests/scenarios/   hand-written workflows, never regenerated
tests/unit/        node:test tests for the tool itself (no test framework dependency)
examples/          a small spec used by the unit tests
```

## Design notes

- **One file per tag, not per endpoint.** Claude sees related operations together and reuses created IDs across them; the output is also easier to review.
- **Plain `expect`, no schema library.** Generated tests should be readable by anyone on the team and have no dependency to drift.
- **The spec hash is the contract.** Regeneration is deterministic in *when* it happens, even if the model's output varies.
- **Review before merge.** Generated code goes through a PR like any other code. The tool makes the PR; a person merges it.

## Related

- [claude-skills](https://github.com/mayurpatild/claude-skills) — the `openapi-to-tests` skill is the interactive version of this tool for use inside Claude Code.
- [recon-kit](https://github.com/mayurpatild/recon-kit) — dataset reconciliation for the data side of the same pipelines.

MIT © Mayur Patil
