---
description: "Inventory only reading the structure and documentation of the project."
language: en
---

# Inspect project

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

```sh
node .pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs
```

O JSON identifies technology, commands, structure and existing documents.
`documentation.files` keeps paths and box, probable paper, size and hash when
reading fits the limits. Valid state references appear in `configured`; names
suggest roles, but do not prove content or approval. In maturity, roadmap and
specs are consulted on the configured paths; status are statements and a local
link does not prove approval or revision. A list of ambiguous or incomplete
specs does not allow you to choose an increment; the status of the link in the
roadmap is also just an indication for query. Specs inventory reads at most 200
entries per folder, 500 entries in total, 1 MiB per spec and 16 MiB specs in
total. If a limit is exceeded, change is detected in a folder or spec while
reading or a path cannot be verified, the list is discarded and marked
incomplete. Detection uses identity and metadata of the file system; it is not
atomic and does not guarantee to detect all simultaneous or reversed changes
during inspection.

Symbolic links are listed as opaque, without reading their destinations.
Document content and configuration values do not appear in the report. `scan` e
`warnings` inform limits and incomplete reading; `scan.complete` summarizes
these conditions. A symbolic folder like `docs` also appears, without assuming
it is empty. Unclassified links receive `role: unclassified`; as long as there
is an uninspected border, `scan.complete` It will be false. Do not use
incomplete inventory as proof of absence of documents. The inspector revalidates
the identity of the paths during reading; this detects changes, but is not an
atomic guarantee against all simultaneous exchange.

`exclusions` describes client folders, artifacts and caches out of inventory.
Human documents in `.github`, examples, wiki and RFCs are included. The
inventory excludes notes generated in `.github/skills`, agents and commands, as
well as client directories like `.zcode` and configuration as `.copilot`.

The script does not create or change files. Read the relevant documents before
planning add-ons; preserve your structure and use templates for gaps only.
`--check` confers the technical structure and roots of agents declared in the
manifest. The canonical manifest with only the header identifies the selection
`none` and dispenses client folders. Without manifest, checking saves the
default roots for the previous layout. The folder `.vscode/` It depends on the
editor's adoption, and an entry to ignore it itself does not require it to
exist. `--root` accepts only the fixtures documented by the command itself,
without expanding access to other projects.

[reading-pt]: ../../../../../.pbai4devs/scripts/inspecionar-projeto/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/scripts/inspecionar-projeto/README.md
