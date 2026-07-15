const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const setupSource = path.resolve(
  __dirname,
  "../skills/lark/scripts/setup.js",
);
const skillSource = path.resolve(__dirname, "../skills/lark/SKILL.md");

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lark-simple-skill-"));
  const skillsDir = path.join(root, "skills");
  const larkDir = path.join(skillsDir, "lark");
  const setupPath = path.join(larkDir, "scripts", "setup.js");
  fs.mkdirSync(path.dirname(setupPath), { recursive: true });
  fs.copyFileSync(setupSource, setupPath);
  fs.copyFileSync(skillSource, path.join(larkDir, "SKILL.md"));
  return { root, skillsDir, larkDir, setupPath };
}

function write(filePath, content = "") {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function writeSkill(directory, name, descriptionYaml) {
  write(
    path.join(directory, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${descriptionYaml}\n---\n\n# ${name}\n`,
  );
}

function runSetup(setupPath, env = {}) {
  return spawnSync(process.execPath, [setupPath], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("moves lark-* skills, replaces nested copies, and cleans the lock", (t) => {
  const { root, skillsDir, larkDir, setupPath } = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  writeSkill(path.join(skillsDir, "lark-doc"), "lark-doc", '"New docs"');
  writeSkill(
    path.join(skillsDir, "lark-im"),
    "lark-im",
    ">\n  Instant messages\n  and chat.",
  );
  write(path.join(skillsDir, "unrelated", "keep.txt"), "keep");
  writeSkill(
    path.join(larkDir, "skills", "lark-doc"),
    "lark-doc",
    '"Old docs"',
  );
  write(
    path.join(root, ".skill-lock.json"),
    JSON.stringify({
      version: 3,
      skills: {
        lark: { source: "lark-simple-skill" },
        "lark-doc": { source: "lark-cli" },
        "lark-im": { source: "lark-cli" },
        unrelated: { source: "elsewhere" },
      },
    }),
  );

  const result = runSetup(setupPath);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /moved 2 lark-\* skill\(s\)/i);
  assert.equal(fs.existsSync(path.join(skillsDir, "lark-doc")), false);
  assert.equal(fs.existsSync(path.join(skillsDir, "lark-im")), false);
  const nestedDoc = fs.readFileSync(
    path.join(larkDir, "skills", "lark-doc", "SKILL.md"),
    "utf8",
  );
  assert.match(nestedDoc, /description: "New docs"/);
  assert.doesNotMatch(nestedDoc, /Old docs/);
  assert.equal(
    fs.readFileSync(path.join(skillsDir, "unrelated", "keep.txt"), "utf8"),
    "keep",
  );

  const lock = JSON.parse(
    fs.readFileSync(path.join(root, ".skill-lock.json"), "utf8"),
  );
  assert.deepEqual(Object.keys(lock.skills).sort(), ["lark", "unrelated"]);

  const generated = fs.readFileSync(path.join(larkDir, "SKILL.md"), "utf8");
  assert.match(
    generated,
    /lark-doc:\n  path: skills\/lark-doc\/SKILL\.md\n  description: "New docs"/,
  );
  assert.match(
    generated,
    /lark-im:\n  path: skills\/lark-im\/SKILL\.md\n  description: >\n    Instant messages\n    and chat\./,
  );
  assert.doesNotMatch(generated, /Run `\$lark setup`/);

  writeSkill(
    path.join(larkDir, "skills", "lark-doc"),
    "lark-doc",
    '"Updated docs"',
  );
  const secondRun = runSetup(setupPath);
  assert.equal(secondRun.status, 0, secondRun.stderr);
  assert.match(secondRun.stdout, /moved 0 lark-\* skill\(s\)/i);
  assert.match(secondRun.stdout, /mapped 2 nested skill\(s\)/i);
  const refreshed = fs.readFileSync(path.join(larkDir, "SKILL.md"), "utf8");
  assert.match(refreshed, /description: "Updated docs"/);
  assert.doesNotMatch(refreshed, /description: "New docs"/);
});

test("rolls back moves and replacements when lock processing fails", (t) => {
  const { root, skillsDir, larkDir, setupPath } = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  writeSkill(path.join(skillsDir, "lark-doc"), "lark-doc", '"New docs"');
  writeSkill(
    path.join(larkDir, "skills", "lark-doc"),
    "lark-doc",
    '"Old docs"',
  );
  write(path.join(root, ".skill-lock.json"), "{ invalid json");
  const originalWrapper = fs.readFileSync(path.join(larkDir, "SKILL.md"), "utf8");

  const result = runSetup(setupPath);
  assert.equal(result.status, 3);
  assert.match(result.stderr, /setup rolled back/i);
  assert.match(
    fs.readFileSync(path.join(skillsDir, "lark-doc", "SKILL.md"), "utf8"),
    /New docs/,
  );
  assert.match(
    fs.readFileSync(
      path.join(larkDir, "skills", "lark-doc", "SKILL.md"),
      "utf8",
    ),
    /Old docs/,
  );
  assert.equal(
    fs.readFileSync(path.join(larkDir, "SKILL.md"), "utf8"),
    originalWrapper,
  );
});

test("rolls back moves and lock changes when metadata generation fails", (t) => {
  const { root, skillsDir, larkDir, setupPath } = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  write(
    path.join(skillsDir, "lark-doc", "SKILL.md"),
    "---\nname: lark-doc\n---\n",
  );
  writeSkill(
    path.join(larkDir, "skills", "lark-doc"),
    "lark-doc",
    '"Old docs"',
  );
  const originalLock = JSON.stringify({
    version: 3,
    skills: {
      lark: { source: "lark-simple-skill" },
      "lark-doc": { source: "lark-cli" },
    },
  });
  write(path.join(root, ".skill-lock.json"), originalLock);
  const originalWrapper = fs.readFileSync(path.join(larkDir, "SKILL.md"), "utf8");

  const result = runSetup(setupPath);
  assert.equal(result.status, 3);
  assert.match(result.stderr, /missing description/);
  assert.equal(fs.existsSync(path.join(skillsDir, "lark-doc")), true);
  assert.match(
    fs.readFileSync(
      path.join(larkDir, "skills", "lark-doc", "SKILL.md"),
      "utf8",
    ),
    /Old docs/,
  );
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(root, ".skill-lock.json"), "utf8")),
    JSON.parse(originalLock),
  );
  assert.equal(
    fs.readFileSync(path.join(larkDir, "SKILL.md"), "utf8"),
    originalWrapper,
  );
});

test("supports a separate source directory through LARK_SKILLS_DIR", (t) => {
  const { root, larkDir, setupPath } = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lark-source-"));
  t.after(() => fs.rmSync(sourceRoot, { recursive: true, force: true }));
  writeSkill(
    path.join(sourceRoot, "lark-calendar"),
    "lark-calendar",
    '"Calendar"',
  );

  const result = runSetup(setupPath, { LARK_SKILLS_DIR: sourceRoot });
  assert.equal(result.status, 0, result.stderr);
  assert.match(
    fs.readFileSync(path.join(larkDir, "SKILL.md"), "utf8"),
    /lark-calendar:\n  path: skills\/lark-calendar\/SKILL\.md\n  description: "Calendar"/,
  );
});
