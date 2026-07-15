---
name: lark
description: "Lark and Feishu operations using lark-cli. Use for Lark, Feishu, or lark-cli tasks."
---

# Lark / Feishu

Use this as the single entry point for Lark/Feishu work.

## Setup

When the user invokes `$lark setup`, `/lark setup`, or otherwise asks to set up,
consolidate, refresh, or update this skill:

1. Resolve this skill's directory as the directory containing this `SKILL.md`.
2. Run `node <this-skill-directory>/scripts/setup.js`.
3. Report the moved skill count, generated metadata count, and any error. Do not
   continue past a failed setup.

The script moves sibling top-level `lark-*` skills into this skill's `skills/`
directory. It preserves the unified `lark` skill and unrelated skills. It also
removes stale top-level `lark-*` entries from the Vercel Skills lockfile while
preserving the `lark` entry.

Every setup run rebuilds the generated metadata section below from the actual
nested `lark-*/SKILL.md` frontmatter, even if there are no new skills to move.
After a successful `lark-cli update`, run setup again because the updater may
recreate top-level skills or change their descriptions.

## Route a Lark request

1. If `skills/lark-shared/SKILL.md` is missing or the metadata section is still
   a placeholder, run setup first.
2. Read `skills/lark-shared/SKILL.md` completely before using `lark-cli`.
3. Match the request against the metadata map below and read the complete
   `SKILL.md` for the smallest relevant domain. Read every referenced file that
   domain marks as required.
4. Use multiple domain skills only when the request genuinely crosses domains.
5. If nothing matches or the CLI lacks the required operation, read
   `skills/lark-openapi-explorer/SKILL.md`.

Do not guess commands, parameters, identity, or permissions. Follow the nested
skill's instructions and use `lark-cli --help`, domain help, and
`lark-cli schema` when required.

## Domain metadata map

Setup replaces the marked placeholder with a YAML map copied from the nested
skill frontmatter. Do not manually edit the generated section.

<!-- BEGIN GENERATED DOMAIN METADATA -->
_Run `$lark setup` or `/lark setup` to generate this map._
<!-- END GENERATED DOMAIN METADATA -->
