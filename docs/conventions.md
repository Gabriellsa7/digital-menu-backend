# Code conventions

All examples below are real names from this repository. New features must
follow these patterns exactly. **Everything is written in English**: code,
variable names, comments, tests and documentation.

## File naming

Lowercase with dots as the type separator: `<feature>.<type>[.<variant>].ts`.

| File type | Pattern | Real example |
| --- | --- | --- |
| Entity | `<feature>.entity.ts` | `src/domain/customer/customer.entity.ts` |
| Domain interface | `<feature>.interface.ts` | `src/domain/customer/interfaces/customer.interface.ts` |
| Service interface | `<feature>.service.interface.ts` | `src/domain/customer/interfaces/customer.service.interface.ts` |
| Domain error | `<name>.error.ts` | `src/domain/errors/not-found.error.ts` |
| Shared domain type | `<name>.interface.ts` | `src/domain/common/pagination.interface.ts` |
| Repository contract | `<feature>.repository.read.ts` / `.write.ts` | `src/domain/customer/repository/customer.repository.read.ts` |
| Service | `<feature>.service.ts` | `src/domain/customer/service/customer.service.ts` |
| Repository implementation | `<feature>.repository.read.ts` / `.write.ts` | `src/infrastructure/repository/customer/customer.repository.write.ts` |
| Mongoose schema | `<feature>.schema.ts` | `src/infrastructure/db/mongo/schema/customer.schema.ts` |
| Mongoose model | `<feature>.model.ts` | `src/infrastructure/db/mongo/models/customer.model.ts` |
| Controller | `<feature>.controller.ts` | `src/interfaces/http/controllers/customer.controller.ts` |
| Controller interface | `controller.interface.ts` | `src/interfaces/http/controllers/controller.interface.ts` |
| Factory | `<feature>.<type>.factory.ts` | `src/infrastructure/config/factories/customer.service.factory.ts` |
| Unit test | `<subject>.unit.test.ts` | `src/__tests__/unit/customer.service.unit.test.ts` |
| Integration test | `<subject>.<action>.int.test.ts` | `src/__tests__/integration/customer.addresses.int.test.ts` |

No exceptions — every file follows the pattern above.

## Symbol naming

| Symbol | Pattern | Real examples |
| --- | --- | --- |
| Domain interface | `I` + PascalCase | `ICustomer`, `ICustomerService`, `IController`, `IPagination` |
| Parameter interface | `IParams` + action/context | `IParamsAddAddress`, `IParamsUpdateCustomerProfile`, `IParamsCustomerService` |
| Repository contract | `I<Feature>Repository<Read\|Write>` | `ICustomerRepositoryRead`, `ICustomerRepositoryWrite` |
| Persistence interface | `IM` + PascalCase, extends the domain interface | `IMCustomer extends ICustomer` (adds `_id: Types.ObjectId`; lives in the schema file) |
| Class | PascalCase, no prefix | `CustomerService`, `CustomerController`, `Server`, `Customer` |
| Factory | `<Feature><Type>Factory` | `CustomerServiceFactory`, `CustomerControllerFactory` |
| Mongoose model | `M` + lowercase, typed with `IM*` | `Mcustomer = mongoose.model<IMCustomer>('customer', customerSchema)` |
| Mongoose schema | camelCase + `Schema`, typed with `IM*` | `customerSchema = new mongoose.Schema<IMCustomer>({...})` |
| Variables/properties | camelCase | `customerRepositoryRead`, `apiSpecLocation` |
| Constants | UPPER_SNAKE_CASE | `OPEN_API_SPEC_FILE_LOCATION`, `HIDE_MONGO_INTERNAL_FIELDS`, `DEFAULT_LIST_LIMIT` |
| Enum (Agents.md, no example in code yet) | `E` + PascalCase, UPPER members | `EStatus.ACTIVE` |

Methods have intent-revealing names: `findCustomerByGoogleSub`, `updateCustomerById`,
`findOrCreateCustomerByVerifiedPhone` — never generic ones like `get` or `handle`.

## Code patterns

- **Always `async/await`**; never chained `.then()`.
- **Controllers**: methods as arrow function properties (`getProfile = async (req, res, next) => {...}`),
  routes registered in `initRoutes()`, class implements `IController` and exposes `getRoutes(): Router`.
- **Controllers are thin**: extract data from `req`, call the service and map the
  success response. No business rules and no error mapping — errors go to `next(error)`.
- **Domain errors** in `src/domain/errors/`: `DomainError` (base, carries `status`),
  `NotFoundError` (404), `ConflictError` (409). Services throw these
  (`throw new NotFoundError('Customer not found')`) and **never** decide HTTP status;
  the central error handler in `server.ts` does the mapping. Do not re-wrap
  errors in `new Error(string)` — that loses the type and the stack.
- **Entities** implement their domain interface with `readonly` properties
  (immutability) and are instantiated by services.
- **Services** decorate every public method with `@ErrorHandler()`
  (`src/domain/common/decorators/error-handler.decorator.ts`) instead of
  writing `try/catch`: domain errors pass through untouched; unexpected errors
  are logged with `eventName: 'service.unexpected_error'` and rethrown.
  Controllers keep their `try/catch` with `next(error)`.
- **Not found**: `return entity ? entity : this.throw<Entity>NotFound();` with a
  private `throw<Entity>NotFound(): never` helper.
- **No comments** in the code: names must explain the intent.
- **Type imports**: relative paths, no path aliases.

## HTTP responses (the `customer` slice pattern)

All error responses follow the contract's `Error`/`ValidationError` schemas
(`{ message, status, ... }`) and are produced **only** by the central error handler:

| Situation | Status | Body | Origin |
| --- | --- | --- | --- |
| Created | 201 | created entity | controller |
| Read/updated | 200 | entity | controller |
| Deleted | 204 | empty | controller |
| Invalid payload (contract) | 400 | `{ message, status, errors[] }` | OpenApiValidator → handler |
| Not found | 404 | `{ message: 'Customer not found', status: 404 }` | `NotFoundError` → handler |
| Conflict (e.g. duplicated email) | 409 | `{ message, status: 409 }` | `ConflictError` → handler |
| Unexpected error | 500 | `{ message: 'Internal Server Error', status: 500 }` | handler (with structured log) |

## OpenAPI contract (`src/contracts/service.yaml`)

Naming rules from the knowledge base (`playbooks/engineering/backend/contracts/CONTRACTS_LAYER.md`),
compatible with the current contract:

- Schemas/entities: PascalCase (`Customer`, `Error`)
- Properties: camelCase (`createdAt`, `email`)
- Route resources: kebab-case, plural (`/me/addresses`, `/delivery-zones`) — this repo does not use an `/api` prefix
- Every endpoint documented with success **and** error examples; types with
  specific formats (`format: email`, `date-time`) and limits where applicable
- List endpoints take `limit`/`offset` query params with sensible bounds

## Style and tooling

- **Prettier**: `singleQuote: true`, `trailingComma: 'all'` (`.prettierrc`). Run `yarn prettier`.
- **ESLint 9 flat config** (`eslint.config.mjs`): `typescript-eslint` recommended;
  unused variables/args are only allowed with a `_` prefix.
- **TypeScript strict** (`tsconfig.json`): target es2016, CommonJS, `esModuleInterop`.
- **Husky**: `pre-commit` runs `yarn lint`; `commit-msg` runs commitlint
  (`commitlint.config.js`, based on the organization standard — KB types,
  lowercase subject, header ≤ 72 chars).

## Commits, branches and release

- **Conventional Commits required** — semantic-release parses messages to
  version (branches `main` and `stage`). Types and impact (full guide in
  `.cursor/rules/ai_knowledge_base/playbooks/engineering/code-versioning/commits/`):
  - `feat:` → minor · `fix:` → patch · `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:` → no bump
  - Format: `<type>[optional scope]: <description>` (e.g. `feat(customer): add address limit`)
- **Branches**: `<type>/<kebab-case-description>` — `feature/add-customer-authentication`,
  `bugfix/fix-login-error`, `hotfix/patch-security-issue`, `release/v1.2.0`.
- PRs via GitHub; merging into `main` triggers the release flow (CI uses `GITHUB_REF_NAME`).

## Comments

Organization knowledge base standard (`playbooks/engineering/backend/AGENTS.md`):

- Comment only when it adds real value — explain the **why**, never the obvious.
- Never leave commented-out code (dead code).
- Prefer self-documenting code: descriptive names, small functions, explicit types.

## Checklist before finishing any change

```bash
yarn prettier && yarn lint && yarn build && yarn test
```

All four commands must pass. `yarn test` runs unit + integration.
