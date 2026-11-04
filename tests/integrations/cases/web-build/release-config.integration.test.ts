import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

/**
 * Static checks of the web-build / CI configuration shipped with the release:
 * the nginx response headers of the web image and the compose invocation of the
 * system-test workflows. They parse the committed files, so they run anywhere.
 */

const root = resolve(__dirname, '../../../..');

const readText = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

type Directive = { name: string; args: string[] };

/**
 * Splits one nginx directive line into its name and arguments, unquoting "…"
 * values.
 */
const parseNginxDirectives = (source: string): Directive[] => {
  const directives: Directive[] = [];

  for (const rawLine of source.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line || line.endsWith('{') || line === '}') continue;

    const tokens = line.replace(/;$/, '').match(/"[^"]*"|\S+/g) ?? [];
    const [name, ...args] = tokens.map((token) => token.replace(/^"|"$/g, ''));
    if (name) directives.push({ name, args });
  }

  return directives;
};

/** Cuts the `location …{ … }` blocks of the server block out of an nginx config. */
const stripComments = (source: string) => source.replace(/#.*$/gm, '');

const parseLocationBlocks = (rawSource: string): { selector: string; body: string }[] => {
  const source = stripComments(rawSource);
  const blocks: { selector: string; body: string }[] = [];
  const pattern = /location\s+([^{]+)\{/g;

  for (const match of source.matchAll(pattern)) {
    const start = match.index + match[0].length;
    let depth = 1;
    let index = start;
    while (index < source.length && depth > 0) {
      if (source[index] === '{') depth += 1;
      if (source[index] === '}') depth -= 1;
      index += 1;
    }
    blocks.push({ selector: (match[1] ?? '').trim(), body: source.slice(start, index - 1) });
  }

  return blocks;
};

const SNIPPET_PATH = '/etc/nginx/snippets/response-headers.conf';

describe('web build nginx response headers', () => {
  const snippet = readText('docker/nginx/response-headers.conf');
  const serverConfig = readText('docker/nginx.conf');
  const headers = parseNginxDirectives(snippet).filter((directive) => directive.name === 'add_header');

  it('SP-23: the shared snippet sets the four hardening headers on every response and nothing else', () => {
    const byName = Object.fromEntries(headers.map(({ args: [name, value, flag] }) => [name, { value, flag }]));

    expect(byName).toEqual({
      'X-Content-Type-Options': { value: 'nosniff', flag: 'always' },
      'X-Frame-Options': { value: 'DENY', flag: 'always' },
      'Referrer-Policy': { value: 'strict-origin-when-cross-origin', flag: 'always' },
      'Content-Security-Policy': { value: "frame-ancestors 'none'", flag: 'always' },
    });
    expect(Object.keys(byName)).not.toContain('X-XSS-Protection');
  });

  it('SP-23: the server block and every location that adds its own header include the snippet', () => {
    const serverLevel = stripComments(serverConfig).split('location')[0];
    expect(serverLevel).toContain(`include ${SNIPPET_PATH};`);

    const locations = parseLocationBlocks(serverConfig);
    expect(locations.length).toBeGreaterThanOrEqual(3);

    for (const location of locations) {
      const directives = parseNginxDirectives(location.body);
      const addsHeaders = directives.some((directive) => directive.name === 'add_header');
      const includesSnippet = directives.some(
        (directive) => directive.name === 'include' && directive.args[0] === SNIPPET_PATH,
      );

      if (addsHeaders) {
        expect(includesSnippet, `location ${location.selector} must re-include the snippet`).toBe(true);
      }
      expect(directives.map((directive) => directive.args[0])).not.toContain('X-XSS-Protection');
    }
  });

  it('SP-23: html is served with no-cache and everything else as immutable, both with the snippet', () => {
    const locations = parseLocationBlocks(serverConfig);
    const cacheControlOf = (selector: string) => {
      const block = locations.find((location) => location.selector === selector);
      const directive = parseNginxDirectives(block?.body ?? '').find(
        ({ name, args }) => name === 'add_header' && args[0] === 'Cache-Control',
      );

      return directive?.args[1];
    };

    expect(cacheControlOf('~* \\.(html|htm|shtml|xhtml)$')).toBe('no-cache');
    expect(cacheControlOf('/')).toBe('public, max-age=31536000, immutable');
  });

  it('SP-23: the release image copies the snippet to the path the server config includes', () => {
    const dockerfile = readText('docker/Dockerfile.release');

    expect(dockerfile).toContain(`COPY docker/nginx/response-headers.conf ${SNIPPET_PATH}`);
    expect(dockerfile).toContain('COPY docker/nginx.conf /etc/nginx/nginx.conf');
  });
});

type Step = { name?: string; run?: string; uses?: string };

const isStep = (value: unknown): value is Step => typeof value === 'object' && value !== null;

/** Collects every `run:` script of a workflow or composite action file. */
const collectRunSteps = (document: unknown): Step[] => {
  if (!isStep(document)) return [];
  const steps: Step[] = [];

  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);

      return;
    }
    if (!isStep(node)) return;
    if (typeof node.run === 'string') steps.push(node);
    for (const value of Object.values(node)) visit(value);
  };
  visit(document);

  return steps;
};

/** First token of every shell command in a `run:` script, `sudo` stripped. */
const commandNames = (script: string): string[] =>
  script
    .split(/\n|;|&&|\|\||\|/)
    .map((command) => command.trim().replace(/^sudo\s+/, ''))
    .filter(Boolean)
    .map((command) => command.split(/\s+/)[0] ?? '');

const listYamlFiles = (directory: string): string[] => {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...listYamlFiles(path));
    else if (/\.ya?ml$/.test(entry)) files.push(path);
  }

  return files;
};

describe('system-test workflows compose invocation', () => {
  const action = parse(readText('.github/workflows/install-test/action.yml'));

  it('SP-25: install-test starts the services with the compose v2 plugin', () => {
    const steps = collectRunSteps(action);
    const compose = steps.find((step) => step.run?.includes('compose up'));

    expect(compose?.run?.trim()).toBe('docker compose up -d');
  });

  it('SP-25: no workflow or action still invokes the standalone docker-compose binary', () => {
    const offenders: string[] = [];

    for (const file of listYamlFiles(join(root, '.github/workflows'))) {
      for (const step of collectRunSteps(parse(readFileSync(file, 'utf8')))) {
        if (commandNames(step.run ?? '').includes('docker-compose')) {
          offenders.push(`${file.replace(root, '')}: ${step.name ?? step.run}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('SP-25: every system-test workflow goes through install-test before running Playwright', () => {
    const systemWorkflows = ['tests_system_pr.yml', 'tests_system_regress.yml', 'tests_system_integrations.yml'];

    for (const workflow of systemWorkflows) {
      const source = readText(`.github/workflows/${workflow}`);
      expect(source, workflow).toContain('uses: ./.github/workflows/install-test');
    }
  });
});
