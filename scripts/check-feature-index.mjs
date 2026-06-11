#!/usr/bin/env node
/**
 * Validates the Feature Map (src/renderer/features/README.md) against the
 * filesystem: every feature/aggregate is listed exactly once, documented
 * modules are linked, spec READMEs carry the Feature Map backlink, and "no spec
 * planned" markers don't contradict reality. Exits non-zero on any drift and
 * prints a coverage summary on success.
 *
 * With `--changed <base-ref>` it additionally diffs HEAD against the merge base
 * with <base-ref> and fails when a changed feature/aggregate has no spec or its
 * code changed without a spec update (used in CI with the PR base).
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FEATURES_DIR = join(ROOT, 'src/renderer/features');
const AGGREGATES_DIR = join(ROOT, 'src/renderer/aggregates');
const MAP_PATH = join(FEATURES_DIR, 'README.md');

if (!existsSync(MAP_PATH)) {
  console.error(`Feature Map not found at ${MAP_PATH}`);
  process.exit(1);
}

const listModules = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

const features = listModules(FEATURES_DIR);
const aggregates = listModules(AGGREGATES_DIR);
const map = readFileSync(MAP_PATH, 'utf8');
const errors = [];

// Re-join list items wrapped by prettier (proseWrap: always indents
// continuation lines of a "- " item with two spaces).
const lines = [];
for (const line of map.split('\n')) {
  if (/^ {2,}\S/.test(line) && lines.length > 0 && lines[lines.length - 1].startsWith('- ')) {
    lines[lines.length - 1] += ` ${line.trim()}`;
  } else {
    lines.push(line);
  }
}

// Entry lines: "- `name`" or "- [`name`](link)", optionally suffixed with
// " (aggregate)", " (no spec planned)" or " (aggregate, no spec planned)"
const entryPattern =
  /^- (?:\[`([\w.-]+)`\]\(([^)]+)\)|`([\w.-]+)`)(?: \((aggregate|no spec planned|aggregate, no spec planned)\))?$/;
const entries = [];
for (const line of lines) {
  if (!line.startsWith('- ')) continue;
  const match = line.match(entryPattern);
  if (!match) {
    errors.push(`Unparseable entry line: "${line}"`);
    continue;
  }
  const suffix = match[4] ?? '';
  entries.push({
    name: match[1] ?? match[3],
    link: match[2] ?? null,
    layer: suffix.includes('aggregate') ? 'aggregates' : 'features',
    noSpecPlanned: suffix.includes('no spec planned'),
  });
}

// Every module on disk is listed exactly once
const layers = [
  ['features', features],
  ['aggregates', aggregates],
];
for (const [layer, names] of layers) {
  for (const name of names) {
    const found = entries.filter((entry) => entry.layer === layer && entry.name === name);
    if (found.length === 0) errors.push(`Missing entry: ${layer}/${name}`);
    if (found.length > 1) errors.push(`Duplicate entry (${found.length}x): ${layer}/${name}`);
  }
}

// No stale entries; documented modules are linked correctly and carry a
// backlink; "no spec planned" markers don't contradict an existing README
let documented = 0;
let noSpecPlanned = 0;
for (const entry of entries) {
  const dir = entry.layer === 'features' ? FEATURES_DIR : AGGREGATES_DIR;
  if (!existsSync(join(dir, entry.name))) {
    errors.push(`Stale entry: ${entry.layer}/${entry.name} does not exist on disk`);
    continue;
  }

  const readmePath = join(dir, entry.name, 'README.md');
  const expectedLink =
    entry.layer === 'features' ? `./${entry.name}/README.md` : `../aggregates/${entry.name}/README.md`;
  const expectedBacklink =
    entry.layer === 'features'
      ? '> Part of the [Feature Map](../README.md)'
      : '> Part of the [Feature Map](../../features/README.md)';

  if (entry.noSpecPlanned) {
    noSpecPlanned += 1;
    if (entry.link !== null) {
      errors.push(`${entry.layer}/${entry.name} is linked but marked "no spec planned" — drop one of the two`);
    } else if (existsSync(readmePath)) {
      errors.push(`${entry.layer}/${entry.name} has a README but is marked "no spec planned" — link it instead`);
    }
    continue;
  }

  if (existsSync(readmePath)) {
    documented += 1;
    if (entry.link === null) {
      errors.push(`${entry.layer}/${entry.name} has a README but is a plain-name entry — link it`);
    } else if (entry.link !== expectedLink) {
      errors.push(`${entry.layer}/${entry.name} link should be "${expectedLink}", got "${entry.link}"`);
    }
    if (!readFileSync(readmePath, 'utf8').includes(expectedBacklink)) {
      errors.push(`${entry.layer}/${entry.name}/README.md is missing the backlink line "${expectedBacklink}"`);
    }
  } else if (entry.link !== null) {
    errors.push(`${entry.layer}/${entry.name} is linked in the map but has no README.md`);
  }
}

// --changed <base-ref>: fail when a changed module lacks a spec or its code
// changed without a spec update
const changedFlagIndex = process.argv.indexOf('--changed');
if (changedFlagIndex !== -1) {
  const baseRef = process.argv[changedFlagIndex + 1];
  if (!baseRef) {
    console.error('Usage: check-feature-index.mjs --changed <base-ref>');
    process.exit(1);
  }

  let diffOutput;
  try {
    diffOutput = execSync(`git diff --name-only ${baseRef}...HEAD`, { cwd: ROOT, encoding: 'utf8' });
  } catch {
    console.error(`Could not diff against "${baseRef}" — is the ref fetched?`);
    process.exit(1);
  }

  const changedModules = new Map();
  for (const file of diffOutput.split('\n')) {
    const match = file.match(/^src\/renderer\/(features|aggregates)\/([\w.-]+)\/(.+)$/);
    if (!match) continue;
    const key = `${match[1]}/${match[2]}`;
    const module = changedModules.get(key) ?? {
      layer: match[1],
      name: match[2],
      codeChanged: false,
      readmeChanged: false,
    };
    if (match[3] === 'README.md') module.readmeChanged = true;
    else module.codeChanged = true;
    changedModules.set(key, module);
  }

  for (const module of changedModules.values()) {
    const dir = module.layer === 'features' ? FEATURES_DIR : AGGREGATES_DIR;
    // a deleted module surfaces as a stale map entry in the structural checks
    if (!existsSync(join(dir, module.name))) continue;

    const entry = entries.find((e) => e.layer === module.layer && e.name === module.name);
    if (entry?.noSpecPlanned) continue;

    const hasReadme = existsSync(join(dir, module.name, 'README.md'));
    if (!hasReadme) {
      errors.push(
        `${module.layer}/${module.name} changed but has no spec — run the feature-specs skill to create one ` +
          `(or mark it "(no spec planned)" in the Feature Map if it is trivial)`,
      );
    } else if (module.codeChanged && !module.readmeChanged) {
      errors.push(
        `${module.layer}/${module.name} code changed but its spec README.md was not updated — ` +
          `run the feature-specs skill to review the spec and reconcile it with the change`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error(`Feature Map check failed — ${errors.length} problem(s):\n`);
  for (const error of errors) console.error(`  - ${error}`);
  console.error('\nRun the `feature-specs` skill in Claude Code to create/update specs and fix the Feature Map.');
  process.exit(1);
}

const total = features.length + aggregates.length;
const pending = total - documented - noSpecPlanned;
console.log(
  `Feature Map OK — ${total} modules: ${documented} documented, ${pending} awaiting a spec, ${noSpecPlanned} no spec planned.`,
);
