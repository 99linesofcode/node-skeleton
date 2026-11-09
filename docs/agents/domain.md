# Domain docs

How agents read this repository's domain documentation before they explore or change the code.

## Before exploring, read these

- **`GLOSSARY-MAP.md`** at the repository root when it exists: it points at one `GLOSSARY.md` per context. Read each one relevant to the topic.
- Otherwise **`GLOSSARY.md`** at the repository root.
- **`docs/adr/`**: read the ADRs that touch the area you are about to work in. In a multi-context repository, also check `src/<context>/docs/adr/` for context-scoped decisions.

When any of these is absent or empty, **proceed silently**: the domain-modeling skill writes terms and decisions the moment they are resolved.

## File structure

Single-context repository (most repositories):

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Multi-context repository (a `GLOSSARY-MAP.md` at the root). The domain-modeling skill promotes a repository to it when a second context appears:

```
/
├── GLOSSARY-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── GLOSSARY.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── GLOSSARY.md
        └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as `GLOSSARY.md` defines it, rather than a synonym it lists under _Avoid_.

A concept the glossary lacks is a signal: either you are inventing language the project does not use (reconsider), or there is a real gap (note it for the domain-modeling skill).

## Flag ADR conflicts

When your output contradicts an existing ADR, say so explicitly:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
