# Testing

## Commands

```bash
yarn test           # unit + integration
yarn test:unit      # jest --config ./jest/jest.config.ts
yarn test:int       # jest --runInBand --forceExit --config ./jest/jest.int-config.ts
yarn test:coverage  # both suites with coverage + merged 80/80 threshold check
yarn coverage:check # nyc merges coverage/int + coverage/unit and enforces ≥80% lines/branches
```

Coverage is measured per suite (unit covers the pure logic, integration covers
the HTTP stack) and **enforced on the merged report** — each suite alone would
fail an 80% branch threshold because they exercise different layers. Runtime
bootstrap files (`main.ts`, `infrastructure/telemetry/tracing.ts`) are excluded:
they are exercised at runtime, not by tests.

CI (`.github/workflows/ci.yml`) runs lint → build → `yarn test:coverage` on
pushes to `main`/`stage` and on pull requests.

## Configuration (`jest/` directory, outside `src/`)

| File | Role |
| --- | --- |
| `jest/jest.config.ts` | Base (unit): `rootDir: '../src'`, `testRegex: '.*\.unit.test\.ts$'`, `setupFiles: ['../jest/setup-tests.ts']`, 20s timeout, `bail: 1` |
| `jest/jest.int-config.ts` | Extends the base: `testRegex: '.*\.int.test\.ts$'`, `globalSetup`/`globalTeardown`, `setupFilesAfterEnv: setup-integration-tests.ts` |
| `jest/setup-tests.ts` | Loads `.env.test` via dotenv (includes `OTEL_SDK_DISABLED=true`) |
| `jest/start-integration.ts` / `stop-integration.ts` | Starts/stops `mongodb-memory-server` (ReplSet) — no local Mongo needed |
| `jest/setup-db.ts` | `MongooseDatabase` class (connection/teardown) |
| `jest/setup-integration-tests.ts` | `beforeAll` calls `bootstrapTest()` and exports `app` (a `Server` instance) |

Support inside `src/`:

- `src/__tests__/configApp.ts` — the `Server` instance for tests. **Every new
  controller must be registered here**, in addition to `src/main.ts`, otherwise
  integration tests get 404/contract errors.
- `src/__tests__/testUtils.ts` — `bootstrapTest()` connects the `MongooseDatabase` and returns `{ dbInstance, app }`.

## Naming (mandatory — enforced by `testRegex`)

| Type | Suffix | Location | Real example |
| --- | --- | --- | --- |
| Unit | `.unit.test.ts` | `src/__tests__/unit/` | `customer.service.unit.test.ts` |
| Integration | `.int.test.ts` | `src/__tests__/integration/` | `customer.addresses.int.test.ts` |

- Name starts with the subject under test (`customer.addresses.int.test.ts`), never generic.
- Do not mix unit and integration specs in the same file.
- Blocks: `describe('When we ...')` / `it('should ...')`.

## Integration test — anatomy (real pattern from `customer.addresses.int.test.ts`)

```ts
import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';

import { loginCustomerWithOtp } from '../helpers/customer-session.helper';

describe('When the customer adds an address', () => {
  it('should save the first address as the default one', async () => {
    const { accessToken } = await loginCustomerWithOtp();

    const { body, statusCode } = await supertest(app.app)
      .post('/me/addresses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(AN_ADDRESS);

    expect(statusCode).toBe(201);
    expect(body.isDefault).toBe(true);
  });
});
```

Watch out for:

- `app.app` is the `express.Application` inside the `Server` class.
- The `mongodb-memory-server` is global (via `globalSetup`); tests run with `--runInBand`
  and data **persists across suites** — use unique ids/emails per test.
- The OpenApiValidator is active in tests: payloads outside the contract return 400,
  responses outside the contract return 500 — update `src/contracts/service.yaml` together.
- Assert that Mongo internals do not leak: `expect(body._id).toBeUndefined()`.

## Unit tests

- Mock every external dependency (repositories, producers) — services receive
  everything via constructor, so pass typed mocks: `jest.Mocked<ICustomerRepositoryRead>`.
  See `customer.service.unit.test.ts` for the canonical pattern (success, conflict
  and not-found scenarios per method).
- Deterministic and fast (<100ms per test).
- OTel stays disabled (`OTEL_SDK_DISABLED=true` in `.env.test`); to test
  trace-context-sensitive code, register an `AsyncLocalStorageContextManager`
  manually as in `src/__tests__/unit/telemetry.unit.test.ts`.

## Coverage

- Minimum 80% globally (lines and branches), enforced on the merged report by
  `yarn coverage:check`; critical domain services ≥ 90%.
- Exclusions already configured: `src/contracts/`, `src/__tests__/`
  (`coveragePathIgnorePatterns`) and the runtime bootstrap `main.ts` /
  `infrastructure/telemetry/tracing.ts` (`collectCoverageFrom`).
