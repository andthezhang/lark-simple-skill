# Lark Simple Skill

One installable `lark` skill for both Lark and Feishu, without dozens of
top-level domain skills cluttering the agent's skill list.

## About

The official `lark-cli` exposes each API domain as a separate agent skill. That
is useful context, but installing one CLI currently adds 27 top-level `lark-*`
skills. This project keeps the complete domain guides while presenting one
visible `lark` entrypoint instead.

It was inspired by [feedback from Jason Zhu](https://x.com/GoSailGlobal/status/2076871317622567126)
that installing a single CLI should not flood an agent with twenty or thirty API
wrapper skills.

Lark is the international brand and Feishu is the mainland China brand. The
official CLI supports both, but both official skill feeds currently use the
`lark-*` prefix—Feishu does not install a separate set of `feishu-*` skills.

## Install

```bash
npx skills add andthezhang/lark-simple-skill -g -y
```

The repository is named `lark-simple-skill`, but the installed skill remains
`lark`. Invoke it through your agent and ask it to set itself up:

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
│       ├── lark-doc/GUIDE.md
│       ├── lark-calendar/GUIDE.md
│       └── ...
└── unrelated-skill/
```

It renames every `SKILL.md` inside the gathered domain folders to `GUIDE.md`
and updates links between those files. This prevents recursive skill discovery
from exposing the nested domains. It also removes the moved top-level names
from Vercel Skills' `.skill-lock.json`, while retaining the `lark` entry and
every unrelated entry.
On every run, setup regenerates the metadata map in `lark/SKILL.md` from the
descriptions in the actual nested domain guides. Running setup again is safe.
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
