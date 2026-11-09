# Issue tracker: obsidian

This repository tracks its work in the Obsidian vault at `~/Documents/Obsidian`, in the vault project named after this repository's directory: the folder of that name under `Projecten/`.

## What lives there

- A **map** is the index of one effort: its Destination, Notes, Decisions so far, Not yet specified and Out of scope. It is a note `_<Effort>.md` in its own folder inside the project folder, or inside the folder of the map it nests in. Status: `open` or `resolved`.
- A **question** is one decision on a map, of type `research`, `prototype`, `grilling` or `task`. It is a note in its map's `issues/` folder, numbered `NN-slug.md`. Status: `open`, `claimed`, `resolved` or `out-of-scope`.
- A **spec** is what a cleared map hands off: the problem, the solution and the decisions to build. An **issue** is one slice of a spec, built and merged on its own. Both live in the project's `issues/` folder, the backlog, numbered `NNNN-slug.md`. Status: a triage role (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`), then `wontfix` or `resolved`.

Every status is the note's `status` property, and every link is a wikilink to a note's name.

## Working with it

Agents create, fetch, list and change maps, questions, specs and issues through the `tracker` skill, which holds the commands for this tracker. Humans open the project folder in Obsidian.
