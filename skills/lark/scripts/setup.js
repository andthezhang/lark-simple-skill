#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const skillDir = path.resolve(__dirname, "..");
const skillsDir = path.resolve(
  process.env.LARK_SKILLS_DIR || path.dirname(skillDir),
);
const nestedDir = path.join(skillDir, "skills");
const lockPath = path.join(path.dirname(skillsDir), ".skill-lock.json");

function exists(candidate) {
  try {
    fs.lstatSync(candidate);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function writeJsonAtomically(filePath, value) {
  const temporaryPath = `${filePath}.lark-setup-${process.pid}`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
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
  console.log(`Would move ${candidates.length} lark-* skill(s).`);
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

  if (exists(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true });
} catch (error) {
  if (lockChanged && originalLockText !== undefined) {
    fs.writeFileSync(lockPath, originalLockText, "utf8");
  }

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
  `Lark setup complete: moved ${moved.length} lark-* skill(s) into ${nestedDir}.`,
);
