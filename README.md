# lark-simple

One installable `lark` skill that consolidates the domain skills installed by
`lark-cli`.

## Install

```bash
npx skills add andthezhang/lark-simple -g -y
```

The repository is named `lark-simple`, but the installed skill is named `lark`.
Invoke it through your agent and ask it to set itself up:

```text
$lark setup
```

or, in agents that use slash commands:

```text
/lark setup
```

These are agent skill invocations, not shell commands.

## What setup does

`lark-cli` installs its domain guides as sibling skills such as `lark-doc`,
`lark-calendar`, and `lark-im`. Setup moves every sibling whose name starts with
`lark-` into the unified skill:

```text
~/.agents/skills/
├── lark/
│   ├── SKILL.md
│   ├── scripts/setup.js
│   └── skills/
│       ├── lark-doc/
│       ├── lark-calendar/
│       └── ...
└── unrelated-skill/
```

It also removes the moved top-level names from Vercel Skills'
`.skill-lock.json`, while retaining the `lark` entry and every unrelated entry.
On every run, setup regenerates the metadata map in `lark/SKILL.md` from the
descriptions in the actual nested domain skills. Running setup again is safe.
If `lark-cli update` recreates or changes top-level `lark-*` skills, invoke
`lark setup` again to replace the nested copies and refresh the map.

The setup script uses Node's filesystem APIs, so it has the same behavior on
macOS, Linux, and Windows. No top-level skill is deleted, and it does not install
a trash utility or shell out to an OS deletion command. During a refresh, the
prior nested copy is held as a rollback backup and discarded only after its
updated replacement has moved successfully. For an unusual installation
layout, set `LARK_SKILLS_DIR` to the directory containing the top-level
`lark-*` source skills.

## Routing

The repository's [`SKILL.md`](skills/lark/SKILL.md) contains a small placeholder
instead of a stale snapshot. Setup replaces it with an exact metadata map of the
installed `lark-*` descriptions. For normal Lark/Feishu work, the agent reads the
shared guide and the smallest matching nested domain guide before using
`lark-cli`.

## License

MIT
