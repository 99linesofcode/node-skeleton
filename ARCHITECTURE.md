# ARCHITECTURE.md

The architecture document for this repository, following the
[architecture.md](https://architecture.md) schema — built so an agent (or a
new colleague) can comprehend the codebase from this file alone, and so this
repository's own architectural principles are visible in how it actually
works. This file is the **canonical statement** of the Node/TypeScript
conventions the `.github-js` starter and every generated package inherit. Fill
every section; update it in the same change that alters the architecture it
describes.

## 1. Project Structure

Module-first, lowercase — the top level screams the domain. The architecture
axis is carried by **file-name role suffixes** (`Action`, `Adapter`, `Port`,
`Mapper`), not layer folders. The composition root sits at the src root,
above the modules. Tests mirror the tree. A generated package starts almost
empty; the shape below is what it grows into.

```
my-package/
├── src/
│   ├── <module>/         # one folder per bounded concept, lowercase
│   ├── shared/           # the kernel: canonical DTOs, pure helpers — imports from no module
│   └── index.mts         # the composition root / public surface — above the modules
├── tests/                # mirrors src/
├── build/                # compiled output (tsc) — never authored, never linted
├── devshell/             # git submodule: devshell-node (nodejs_22, pnpm)
├── eslint.config.js      # boundary enforcement lives here (eslint-plugin-boundaries)
└── package.json
```

**Where the logic lives.** A use case is an action: a class with one
meaningful responsibility, composed of smaller actions. A trivial
calculation is a one-function file beside the actions (`toDiffView.ts`),
with no DI and no I/O. Logic that spans entities but owns none is a pure
class in `shared/`. Delivery mechanics (timers, event subscription, queues)
belong to the entry point / driving side and make no business decisions.
Adapters map raw external data onto canonical DTOs at the boundary; the core
never sees a provider shape.

**Growth rule.** Start flat. A folder appears when a second file of that
role or concept exists — never as an upfront scaffold. Modules split when
they outgrow grasp, not before.

## 2. High-Level System Diagram

A fresh package is a library: a public surface re-exporting modules, consumed
by another program. There is no running service until the package grows one.

```
[Consumer / host app]
        │  imports the package
        ▼
┌─────────────────────────────┐
│  src/index.mts (entry)      │  the package's public surface
│    re-exports modules       │
└──────────────┬──────────────┘
               │
     ┌─────────┴─────────┐
     ▼                   ▼
[<module>/]         [shared/]  the kernel — imports from no module
 (actions, adapters, (canonical DTOs,
  mappers)            pure helpers)
               │
               ▼
        [build/]  tsc output — the published artifact
```

When the package acquires a real external dependency, the dependency is
reached through a **port** in `shared/` implemented by an adapter in a
provider module — never called directly from a neutral module. Until then,
there are no ports (the lean guardrail).

## 3. Core Components

For a generated package: the entry point, the modules, the shared kernel.
Key technologies: TypeScript (ESM, NodeNext), vitest, eslint with
`eslint-plugin-boundaries`, prettier. Deployment target: a compiled npm
package (`build/`).

| Component | Responsibility |
|---|---|
| `src/index.mts` | The public surface: re-exports modules; the composition root when the package wires providers |
| `src/<module>/` | One bounded concept: actions (use cases), adapters (boundary), mappers (raw ⇄ canonical), pure helpers |
| `src/shared/` | The kernel: canonical DTOs and pure helpers; imports from no module |
| `devshell/` | The pinned dev environment (`devshell-node`) |

### Ports & adapters

A fresh package owns **no ports**: with no external dependency there is no
seam to protect, and adding one speculatively is the ceremony the lean
guardrail forbids. When a real external dependency arrives (or a second
implementation appears), the pattern is fixed: define the port in
`shared/` stating the **core need** it serves, implement it in the provider
module, and wire it at the composition root. A component reaching around its
port is a defect.

## 4. Data Stores

None by default. A generated package owns no database and no persistent
store; if it acquires one, name it here with its type, purpose and key
collections — and keep access behind a port.

## 5. External Integrations / APIs

None by default. When a package integrates a third-party service, record it
here: name, purpose, integration method (REST, SDK, webhook) and **which port
it sits behind**.

## 6. Deployment & Infrastructure

- **Build**: `pnpm build` compiles `src/` with `tsc -p tsconfig.build.json`
  to `build/`; `package.json` publishes `files: ["build"]` with
  `main: build/index.mjs`.
- **Consumption**: `node-skeleton` itself is a starter, not a deployed
  service. A generated repo consumes it via a secondary remote:
  `git remote add skeleton git@github.com:99linesofcode/node-skeleton.git`,
  then `git fetch skeleton && git rebase skeleton/main`. Updates flow the
  same way; rebase conflicts are the divergence points, resolved by keeping
  the consuming repo's override.
- **CI/CD**: Dependabot only (`.github/dependabot.yaml`), grouped into
  automated patch/minor and manual major updates. There is no test or
  publish workflow in the skeleton itself; the consuming repo adds its own.
- **Monitoring/logging**: none.

## 7. Security Considerations

- **Secrets**: never committed. `.gitignore` covers `.env` files;
  `.env.example` is the template. The shared ignore rules come from
  `git-skeleton`.
- **Dependencies**: `pnpm audit` is a first-class script; Dependabot raises
  updates. No secrets or tokens are baked into the skeleton.
- **Supply chain**: lockfile (`pnpm-lock.yaml`) is tracked, never ignored.

## 8. Development & Testing Environment

- **Local setup**: `direnv allow` (the `devshell` submodule of
  [devshell-node](https://github.com/99linesofcode/devshell-node) via
  `.envrc` → `use flake ./devshell`) provides `nodejs_22`, `pnpm`,
  `typescript`, `eslint` and `prettier`; then `pnpm install`.
- **Testing**: Vitest (`pnpm test`, `pnpm test:watch`). Tests mirror `src/`.
- **Code quality**: TypeScript strict (`tsc --noEmit`), ESLint flat config
  with `eslint-plugin-boundaries` and prettier.
- **Mechanical gates** (and what each makes impossible):
  - `boundaries/dependencies` — the module matrix (`entry` may use modules
    and the kernel; a `module` may use the kernel; `shared` imports from no
    module). An unlisted import edge fails the build, so the dependency
    graph stays acyclic and the kernel stays neutral.
  - `boundaries/no-unknown-files` — every `src` file must belong to an
    element, so a new top-level module cannot slip in unclassified.
  - `tsc` strict flags (`strict`, `noUncheckedIndexedAccess`,
    `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters`,
    `noImplicitOverride`, `noImplicitReturns`) — a class of runtime bugs is
    made a compile error.
  - `prettier` (via `eslint-config-prettier`) — formatting is never a review
    topic.

## 9. Future Considerations / Roadmap

**Deliberate non-goals** (the lean guardrail — decisions, not omissions):

- **No layer folders** (`domain/`, `infrastructure/`). The architecture axis
  is the file-name role suffix; a role folder appears inside a module only
  when a second file of that role exists.
- **No speculative ports or adapters.** A port is added when a real external
  seam exists, not before.
- **No upfront scaffolding.** Folders and modules are created by the second
  file, never by the template.
- **No `Utils/`/`Helpers/` dump.** Generic code that could be framework-grade
  goes to `shared/`; there is no grab-bag.
- **No bespoke boundary script.** Boundary enforcement lives in the existing
  `eslint .` step via `eslint-plugin-boundaries`.

**Known debt / open items**: none recorded; this skeleton is intentionally
minimal.

## 10. Project Identification

Project Name: node-skeleton

Repository URL: https://github.com/99linesofcode/node-skeleton

Primary Contact/Team: Jordy Schreuders (99linesofcode)

Date of Last Update: 2026-10-06

## 11. Glossary / Acronyms

- **Skeleton** — a starter repository consumed via a secondary git remote and
  rebase; the consuming repo owns its own history.
- **Consumer / generated package** — a repo created from this skeleton.
- **Module** — one bounded concept, one lowercase folder under `src/`.
- **Shared kernel** — `src/shared/`; the neutral ground that imports from no
  module.
- **Role suffix** — the file-name suffix that locates a class's architectural
  role (`Action`, `Adapter`, `Port`, `Mapper`).
- **Two axes** — the naming rule: the suffix locates the role, the prefix
  names the domain concept.
- **Composition root** — `src/index.mts`; the one place providers are wired.
- **Boundary gate** — `eslint-plugin-boundaries`, enforcing the module
  dependency matrix inside `eslint .`.
- **DTO** — Data Transfer Object; one canonical shape per domain concept,
  owned by the core.

## 12. Conventions & Boundaries

The house standards this repository adheres to — stated here in full; this
section records what is enforced **here**, and by which gate. Enforced by
`eslint-plugin-boundaries`
(elements = the module folders), so the gate runs inside the existing
`eslint .` step:

- **Folder structure**: module-first, lowercase; the path locates the
  module, the name locates the role. No layer folders.
- **File naming**: PascalCase classes with role suffixes
  (`SyncGithubTasksAction`, `GitHubAdapter`, `ProjectManagementPort`,
  `GithubTaskMapper`); camelCase pure functions, one per file
  (`toDiffView.ts`, `projectHomePath.ts`). Tests mirror the tree:
  `tests/<module>/…`.
- **Entry point**: `src/index.mts` — above the modules, never inside one;
  the package's public surface.
- **Dependency matrix**: the shared kernel (`shared/`) imports from **no**
  module; provider modules never import each other; neutral modules consume
  the kernel and the ports that live in it — never a provider adapter
  directly; the composition root wires everything; no circular module
  dependencies.
- **Provider neutrality**: provider names appear only in provider modules
  and the composition root; shared and cross-cutting vocabulary is neutral.
- **Canonical DTOs**: one canonical shape per domain concept, owned by the
  core; diff/merge logic operates on canonical fields only. A DTO mimicking
  a provider's structure is a provider shape, whatever its file name.
- **Growth rule**: start flat; a folder appears when a second file of that
  role or concept exists.
- **Documentation surfaces**: WHY comments at the change site; a change that
  alters the architecture updates this file in the same change.
