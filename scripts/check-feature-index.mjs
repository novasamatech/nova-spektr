#!/usr/bin/env node
/**
 * Validates the Feature Map (src/renderer/features/README.md) against the
 * filesystem: every feature/aggregate is listed exactly once, documented
 * modules are linked, spec READMEs carry the Feature Map backlink, and the
 * "Documented: N / M" counter is accurate. Exits non-zero on any drift.
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

// Entry lines: "- `name`" or "- [`name`](link)", optionally suffixed " (aggregate)"
const entryPattern = /^- (?:\[`([\w.-]+)`\]\(([^)]+)\)|`([\w.-]+)`)( \(aggregate\))?$/;
const entries = [];
for (const line of map.split('\n')) {
  if (!line.startsWith('- ')) continue;
  const match = line.match(entryPattern);
  if (!match) {
    errors.push(`Unparseable entry line: "${line}"`);
    continue;
  }
  entries.push({
    name: match[1] ?? match[3],
    link: match[2] ?? null,
    layer: match[4] ? 'aggregates' : 'features',
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

// No stale entries; documented modules are linked correctly and carry a backlink
let documented = 0;
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
    entry.layer === 'features' ? '[Feature Map](../README.md)' : '[Feature Map](../../features/README.md)';

  if (existsSync(readmePath)) {
    documented += 1;
    if (entry.link === null) {
      errors.push(`${entry.layer}/${entry.name} has a README but is a plain-name entry — link it`);
    } else if (entry.link !== expectedLink) {
      errors.push(`${entry.layer}/${entry.name} link should be "${expectedLink}", got "${entry.link}"`);
    }
    if (!readFileSync(readmePath, 'utf8').includes(expectedBacklink)) {
      errors.push(`${entry.layer}/${entry.name}/README.md is missing the backlink "> Part of the ${expectedBacklink}"`);
    }
  } else if (entry.link !== null) {
    errors.push(`${entry.layer}/${entry.name} is linked in the map but has no README.md`);
  }
}

// Counter
const total = features.length + aggregates.length;
const counter = map.match(/\*\*Documented: (\d+) \/ (\d+)\*\*/);
if (!counter) {
  errors.push('Counter line "**Documented: N / M**" not found in the map');
} else {
  if (Number(counter[1]) !== documented) {
    errors.push(`Counter says ${counter[1]} documented, actual count is ${documented}`);
  }
  if (Number(counter[2]) !== total) {
    errors.push(`Counter says ${counter[2]} total, actual count is ${total}`);
  }
}

if (errors.length > 0) {
  console.error(`Feature Map check failed — ${errors.length} problem(s):\n`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`Feature Map OK — ${documented} / ${total} modules documented.`);
