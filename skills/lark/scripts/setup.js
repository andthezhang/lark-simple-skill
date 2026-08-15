#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const skillDir = path.resolve(__dirname, "..");
const skillsDir = path.resolve(
  process.env.LARK_SKILLS_DIR || path.dirname(skillDir),
);
const nestedDir = path.join(skillDir, "skills");
const lockPath = path.join(path.dirname(skillsDir), ".skill-lock.json");
const skillPath = path.join(skillDir, "SKILL.md");
const metadataStart = "<!-- BEGIN GENERATED DOMAIN METADATA -->";
const metadataEnd = "<!-- END GENERATED DOMAIN METADATA -->";

function exists(candidate) {
  try {
    fs.lstatSync(candidate);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function writeTextAtomically(filePath, value) {
  const temporaryPath = `${filePath}.lark-setup-${process.pid}`;
  fs.writeFileSync(temporaryPath, value, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function writeJsonAtomically(filePath, value) {
  writeTextAtomically(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function extractRawDescription(frontmatterPath) {
  const lines = fs.readFileSync(frontmatterPath, "utf8").split(/\r?\n/);
  if (lines[0] !== "---") {
    throw new Error(`missing YAML frontmatter: ${frontmatterPath}`);
  }

  const end = lines.indexOf("---", 1);
  if (end === -1) {
    throw new Error(`unterminated YAML frontmatter: ${frontmatterPath}`);
  }

  const index = lines.slice(1, end).findIndex((line) =>
    line.startsWith("description:"),
  );
  if (index === -1) {
    throw new Error(`missing description in frontmatter: ${frontmatterPath}`);
  }

  const absoluteIndex = index + 1;
  const description = [lines[absoluteIndex]];
  for (let cursor = absoluteIndex + 1; cursor < end; cursor += 1) {
    const line = lines[cursor];
    if (line !== "" && !/^\s/.test(line)) break;
    description.push(line);
  }

  while (description.at(-1) === "") description.pop();
  return description;
}

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(entryPath) : [entryPath];
  });
}

function markdownPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function nestedGuideNames() {
  return fs
    .readdirSync(nestedDir)
    .filter((name) => {
      if (!name.startsWith("lark-")) return false;
      return exists(path.join(nestedDir, name, "GUIDE.md"));
    })
    .sort();
}

function nestedDomainNames() {
  return fs
    .readdirSync(nestedDir)
    .filter((name) => {
      if (!name.startsWith("lark-")) return false;
      return ["GUIDE.md", "SKILL.md"].some((fileName) =>
        exists(path.join(nestedDir, name, fileName)),
      );
    })
    .sort();
}

function restoreConvertedGuides(conversion) {
  for (const { skillPath, guidePath } of [...conversion.renames].reverse()) {
    if (exists(guidePath) && !exists(skillPath)) {
      fs.renameSync(guidePath, skillPath);
    }
  }
  for (const { filePath, original } of conversion.changedFiles) {
    writeTextAtomically(filePath, original);
  }
}

function convertNestedSkillsToGuides() {
  const skillFiles = filesUnder(nestedDir).filter(
    (filePath) => path.basename(filePath) === "SKILL.md",
  );
  const renames = skillFiles.map((skillPath) => ({
    skillPath,
    guidePath: path.join(path.dirname(skillPath), "GUIDE.md"),
  }));

  for (const { guidePath } of renames) {
    if (exists(guidePath)) {
      throw new Error(`refusing to overwrite existing guide: ${guidePath}`);
    }
  }

  const changedFiles = [];
  const completedRenames = [];
  try {
    for (const filePath of filesUnder(nestedDir).filter(
      (candidate) => path.extname(candidate) === ".md",
    )) {
      const original = fs.readFileSync(filePath, "utf8");
      let updated = original;
      for (const { skillPath, guidePath } of renames) {
        const skillRelative = markdownPath(
          path.relative(path.dirname(filePath), skillPath),
        );
        const guideRelative = markdownPath(
          path.relative(path.dirname(filePath), guidePath),
        );
        if (skillRelative.includes("/")) {
          updated = updated.replaceAll(skillRelative, guideRelative);
        }

        const directoryName = path.basename(path.dirname(skillPath));
        updated = updated.replaceAll(
          `${directoryName}/SKILL.md`,
          `${directoryName}/GUIDE.md`,
        );
      }
      if (updated !== original) {
        writeTextAtomically(filePath, updated);
        changedFiles.push({ filePath, original });
      }
    }

    for (const rename of renames) {
      fs.renameSync(rename.skillPath, rename.guidePath);
      completedRenames.push(rename);
    }
  } catch (error) {
    restoreConvertedGuides({
      renames: completedRenames,
      changedFiles,
    });
    throw error;
  }

  return { renames, changedFiles };
}

function buildMetadataSection() {
  const names = nestedGuideNames();
  if (names.length === 0) {
    return {
      count: 0,
      content: "_No nested `lark-*` skills were found. Run setup again after installing them._",
    };
  }

  const entries = names.map((name) => {
    const frontmatterPath = path.join(nestedDir, name, "GUIDE.md");
    const description = extractRawDescription(frontmatterPath)
      .map((line) => `  ${line}`)
      .join("\n");
    return `${name}:\n  path: skills/${name}/GUIDE.md\n${description}`;
  });

  return {
    count: names.length,
    content: `\`\`\`yaml\n${entries.join("\n")}\n\`\`\``,
  };
}

function renderSkillWithMetadata(current, content) {
  const start = current.indexOf(metadataStart);
  const end = current.indexOf(metadataEnd);
  if (start === -1 || end === -1 || end < start) {
    throw new Error("metadata markers are missing or out of order in SKILL.md");
  }
  if (
    current.indexOf(metadataStart, start + metadataStart.length) !== -1 ||
    current.indexOf(metadataEnd, end + metadataEnd.length) !== -1
  ) {
    throw new Error("metadata markers must appear exactly once in SKILL.md");
  }

  const before = current.slice(0, start + metadataStart.length);
  const after = current.slice(end);
  return `${before}\n${content}\n${after}`;
}

if (skillsDir === path.parse(skillsDir).root) {
  console.error(`error: refusing unsafe skills directory: ${skillsDir}`);
  process.exit(2);
}

if (!exists(skillDir) || !fs.lstatSync(skillDir).isDirectory()) {
  console.error(`error: unified lark skill directory not found: ${skillDir}`);
  process.exit(2);
}

const candidates = fs
  .readdirSync(skillsDir)
  .filter((name) => name.startsWith("lark-") && name !== "lark")
  .sort();

if (process.argv.includes("--dry-run")) {
  for (const name of candidates) {
    console.log(`${path.join(skillsDir, name)} -> ${path.join(nestedDir, name)}`);
  }
  const knownNames = new Set([
    ...candidates,
    ...(exists(nestedDir) ? nestedDomainNames() : []),
  ]);
  console.log(
    `Would move ${candidates.length} lark-* skill(s) and regenerate metadata for ${knownNames.size} skill(s).`,
  );
  process.exit(0);
}

fs.mkdirSync(nestedDir, { recursive: true });

const backupDir = path.join(
  skillDir,
  `.setup-backup-${process.pid}-${Date.now()}`,
);
const moved = [];
let originalLockText;
let lockChanged = false;
const originalSkillText = fs.readFileSync(skillPath, "utf8");
let skillChanged = false;
let metadataCount = 0;
let conversion;

try {
  for (const name of candidates) {
    const source = path.join(skillsDir, name);
    const destination = path.join(nestedDir, name);
    const backup = path.join(backupDir, name);

    if (exists(destination)) {
      fs.mkdirSync(backupDir, { recursive: true });
      fs.renameSync(destination, backup);
    }

    try {
      fs.renameSync(source, destination);
    } catch (error) {
      if (exists(backup) && !exists(destination)) {
        fs.renameSync(backup, destination);
      }
      throw error;
    }

    moved.push({ source, destination, backup });
    console.log(`Moved ${name} into lark/skills/.`);
  }

  conversion = convertNestedSkillsToGuides();

  if (exists(lockPath)) {
    originalLockText = fs.readFileSync(lockPath, "utf8");
    const lock = JSON.parse(originalLockText);
    if (lock && lock.skills && typeof lock.skills === "object") {
      const staleNames = Object.keys(lock.skills).filter((name) =>
        name.startsWith("lark-"),
      );
      for (const name of staleNames) delete lock.skills[name];
      if (staleNames.length > 0) {
        writeJsonAtomically(lockPath, lock);
        lockChanged = true;
        console.log(
          `Removed ${staleNames.length} top-level lark-* entr${staleNames.length === 1 ? "y" : "ies"} from .skill-lock.json.`,
        );
      }
    }
  }

  const metadata = buildMetadataSection();
  metadataCount = metadata.count;
  const updatedSkillText = renderSkillWithMetadata(
    originalSkillText,
    metadata.content,
  );
  if (updatedSkillText !== originalSkillText) {
    writeTextAtomically(skillPath, updatedSkillText);
    skillChanged = true;
  }
  console.log(`Generated metadata for ${metadataCount} nested skill(s).`);

  if (exists(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true });
} catch (error) {
  if (skillChanged) {
    fs.writeFileSync(skillPath, originalSkillText, "utf8");
  }
  if (lockChanged && originalLockText !== undefined) {
    fs.writeFileSync(lockPath, originalLockText, "utf8");
  }
  if (conversion) restoreConvertedGuides(conversion);

  for (const item of moved.reverse()) {
    if (exists(item.destination) && !exists(item.source)) {
      fs.renameSync(item.destination, item.source);
    }
    if (exists(item.backup) && !exists(item.destination)) {
      fs.renameSync(item.backup, item.destination);
    }
  }

  if (exists(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true });
  console.error(`error: setup rolled back: ${error.message}`);
  process.exit(3);
}

console.log(
  `Lark setup complete: moved ${moved.length} lark-* skill(s) and mapped ${metadataCount} nested skill(s) in ${nestedDir}.`,
);
