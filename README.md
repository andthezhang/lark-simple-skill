# lark

A single Lark/Feishu agent skill with one small cleanup script.

`lark-cli update` can install 20+ separate `lark-*` skills. This skill tells an
agent to use the guides already embedded in `lark-cli`, then remove those
separate copies after a successful update.

## Install

Once this repository is public:

```bash
npx skills add andthezhang/lark-update -g -y
```

The installed skill contains only:

```text
SKILL.md
scripts/compact-skills.sh
```

## How it works

For normal Lark work, the agent reads the current embedded guides:

```bash
lark-cli skills list
lark-cli skills read lark-shared
lark-cli skills read lark-doc
```

When the agent runs `lark-cli update`, it waits for success and then runs:

```bash
bash <installed-lark-skill>/scripts/compact-skills.sh
```

The script removes sibling entries matching `lark-*`, preserves this unified
skill, and leaves unrelated skills untouched. It discovers the skills directory
from its own installed location; no hard-coded `~/.agents/skills` path is
required.

For an unusual layout, override discovery explicitly:

```bash
LARK_SKILLS_DIR=/path/to/skills bash skills/lark/scripts/compact-skills.sh
```

## Caveat

The cleanup removes sibling entries whose names begin with `lark-`. Do not use
that prefix for unrelated custom skills in the same directory.

## License

MIT
