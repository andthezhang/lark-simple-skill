---
name: lark
description: "Unified Lark and Feishu skill. Use for any Lark/Feishu task and whenever lark-cli is installed or updated. Routes agents to the domain guides embedded in lark-cli and removes the separate lark-* skills after a successful update."
---

# Lark / Feishu

Use this as the single entry point for all Lark and Feishu work.

## Before using lark-cli

1. List the domain guides embedded in the installed CLI:

   ```bash
   lark-cli skills list
   ```

2. Read the shared authentication and safety guidance:

   ```bash
   lark-cli skills read lark-shared
   ```

3. Read the smallest relevant domain guide before running commands. For example:

   ```bash
   lark-cli skills read lark-doc
   lark-cli skills read lark-calendar
   lark-cli skills read lark-im
   ```

4. Read a guide's referenced files through the CLI:

   ```bash
   lark-cli skills read <skill-name> <relative-path>
   ```

5. If no domain guide covers the request, read:

   ```bash
   lark-cli skills read lark-openapi-explorer
   ```

Do not guess commands or parameters. Use `lark-cli --help`, domain help, and
`lark-cli schema` when needed.

## After updating lark-cli

Whenever you run:

```bash
lark-cli update
```

wait for it to finish. If and only if it succeeds, run this skill's cleanup
script:

```bash
bash <this-skill-directory>/scripts/compact-skills.sh
```

Resolve `<this-skill-directory>` to the directory containing this `SKILL.md`.
Do not run the cleanup after a failed or cancelled update.

The script removes sibling `lark-*` skill entries installed by the updater. It
preserves this unified skill and unrelated skills. Detailed guides remain
available through `lark-cli skills read`, so separate installed copies are not
needed.
