// @vitest-environment node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

const INDEX_HTML_PATH = resolve(__dirname, 'index.html');

let htmlContent = '';
let cspContent = '';

beforeAll(() => {
  htmlContent = readFileSync(INDEX_HTML_PATH, 'utf-8');

  // The content attribute uses double-quotes while CSP directives contain
  // single-quoted keywords like 'self' — match only double-quote delimiters
  // to avoid false termination on inner single quotes.
  const cspMetaMatch = htmlContent.match(/http-equiv=["']Content-Security-Policy["'][\s\S]*?content="([\s\S]*?)"/i);

  if (cspMetaMatch?.[1]) {
    // Normalize whitespace to reliably match directives regardless of formatting
    cspContent = cspMetaMatch[1].replace(/\s+/g, ' ').trim();
  }
});

describe('src/renderer/app/index.html — Content-Security-Policy meta tag', () => {
  it('should contain a CSP meta tag with http-equiv="Content-Security-Policy"', () => {
    expect(htmlContent).toMatch(/http-equiv=["']Content-Security-Policy["']/i);
  });

  it('should have a non-empty CSP content attribute', () => {
    expect(cspContent.length).toBeGreaterThan(0);
  });

  it("should contain directive: default-src 'self'", () => {
    expect(cspContent).toContain("default-src 'self'");
  });

  it("should contain directive: script-src 'self'", () => {
    expect(cspContent).toContain("script-src 'self'");
  });

  it("should contain directive: style-src 'self' 'unsafe-inline'", () => {
    expect(cspContent).toContain("style-src 'self' 'unsafe-inline'");
  });

  it('should contain directive: img-src allowing data: blob: https:', () => {
    expect(cspContent).toContain('img-src');
    expect(cspContent).toContain('data:');
    expect(cspContent).toContain('blob:');
    expect(cspContent).toContain('https:');
  });

  it('should contain directive: connect-src allowing wss: and ws: for Substrate RPC', () => {
    expect(cspContent).toContain('connect-src');
    expect(cspContent).toContain("'self'");
    expect(cspContent).toContain('wss:');
    expect(cspContent).toContain('ws:');
  });

  it("should contain directive: font-src 'self' data:", () => {
    expect(cspContent).toContain('font-src');
    expect(cspContent).toContain('data:');
  });

  it("should contain directive: object-src 'none' (no plugins/Flash)", () => {
    expect(cspContent).toContain("object-src 'none'");
  });

  it("should contain directive: frame-src 'none' (no iframes)", () => {
    expect(cspContent).toContain("frame-src 'none'");
  });

  it('should contain upgrade-insecure-requests directive', () => {
    expect(cspContent).toContain('upgrade-insecure-requests');
  });

  it('should NOT allow unsafe-eval in script-src (prevents XSS)', () => {
    expect(cspContent).not.toContain("'unsafe-eval'");
  });

  it('should NOT use wildcard (*) as default-src', () => {
    expect(cspContent).not.toMatch(/default-src\s+\*/);
  });

  it('CSP meta tag should appear in the <head> section', () => {
    const headMatch = htmlContent.match(/<head[\s\S]*?<\/head>/i);
    expect(headMatch).not.toBeNull();
    expect(headMatch![0]).toMatch(/http-equiv=["']Content-Security-Policy["']/i);
  });

  it('should have replaced the old minimal CSP (upgrade-insecure-requests only)', () => {
    expect(cspContent).toContain('default-src');
    const isOldPolicy = cspContent.replace(/\s+/g, ' ').trim() === 'upgrade-insecure-requests';
    expect(isOldPolicy).toBe(false);
  });
});
