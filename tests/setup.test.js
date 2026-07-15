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

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lark-simple-"));
  const skillsDir = path.join(root, "skills");
  const larkDir = path.join(skillsDir, "lark");
  const setupPath = path.join(larkDir, "scripts", "setup.js");
  fs.mkdirSync(path.dirname(setupPath), { recursive: true });
  fs.copyFileSync(setupSource, setupPath);
  return { root, skillsDir, larkDir, setupPath };
}

function write(filePath, content = "") {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
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

  write(path.join(skillsDir, "lark-doc", "new.txt"), "new");
  write(path.join(skillsDir, "lark-im", "SKILL.md"), "im");
  write(path.join(skillsDir, "unrelated", "keep.txt"), "keep");
  write(path.join(larkDir, "skills", "lark-doc", "old.txt"), "old");
  write(
    path.join(root, ".skill-lock.json"),
    JSON.stringify({
      version: 3,
      skills: {
        lark: { source: "lark-simple" },
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
  assert.equal(
    fs.readFileSync(path.join(larkDir, "skills", "lark-doc", "new.txt"), "utf8"),
    "new",
  );
  assert.equal(
    fs.existsSync(path.join(larkDir, "skills", "lark-doc", "old.txt")),
    false,
  );
  assert.equal(
    fs.readFileSync(path.join(larkDir, "skills", "lark-im", "SKILL.md"), "utf8"),
    "im",
  );
  assert.equal(
    fs.readFileSync(path.join(skillsDir, "unrelated", "keep.txt"), "utf8"),
    "keep",
  );

  const lock = JSON.parse(
    fs.readFileSync(path.join(root, ".skill-lock.json"), "utf8"),
  );
  assert.deepEqual(Object.keys(lock.skills).sort(), ["lark", "unrelated"]);

  const secondRun = runSetup(setupPath);
  assert.equal(secondRun.status, 0, secondRun.stderr);
  assert.match(secondRun.stdout, /moved 0 lark-\* skill\(s\)/i);
});

test("rolls back moves and replacements when lock processing fails", (t) => {
  const { root, skillsDir, larkDir, setupPath } = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  write(path.join(skillsDir, "lark-doc", "new.txt"), "new");
  write(path.join(larkDir, "skills", "lark-doc", "old.txt"), "old");
  write(path.join(root, ".skill-lock.json"), "{ invalid json");

  const result = runSetup(setupPath);
  assert.equal(result.status, 3);
  assert.match(result.stderr, /setup rolled back/i);
  assert.equal(
    fs.readFileSync(path.join(skillsDir, "lark-doc", "new.txt"), "utf8"),
    "new",
  );
  assert.equal(
    fs.readFileSync(path.join(larkDir, "skills", "lark-doc", "old.txt"), "utf8"),
    "old",
  );
});

test("supports a separate source directory through LARK_SKILLS_DIR", (t) => {
  const { root, larkDir, setupPath } = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lark-source-"));
  t.after(() => fs.rmSync(sourceRoot, { recursive: true, force: true }));
  write(path.join(sourceRoot, "lark-calendar", "SKILL.md"), "calendar");

  const result = runSetup(setupPath, { LARK_SKILLS_DIR: sourceRoot });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    fs.readFileSync(
      path.join(larkDir, "skills", "lark-calendar", "SKILL.md"),
      "utf8",
    ),
    "calendar",
  );
});
