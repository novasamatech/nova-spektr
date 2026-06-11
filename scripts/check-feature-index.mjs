#!/usr/bin/env node
/**
 * Validates the Feature Map (src/renderer/features/README.md) against the
 * filesystem: every feature/aggregate is listed exactly once, documented
 * modules are linked, spec READMEs carry the Feature Map backlink, and
 * "no spec planned" markers don't contradict reality. Exits non-zero on any
 * drift and prints a coverage summary on success.
 */
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

if (errors.length > 0) {
  console.error(`Feature Map check failed — ${errors.length} problem(s):\n`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

const total = features.length + aggregates.length;
const pending = total - documented - noSpecPlanned;
console.log(
  `Feature Map OK — ${total} modules: ${documented} documented, ${pending} awaiting a spec, ${noSpecPlanned} no spec planned.`,
);
