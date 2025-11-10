import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { deepLinkService, extractParams } from './service';

describe('deepLinkService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createDeepLinkHandler', () => {
    it('should create handler with unique id', () => {
      const schema = z.object({ foo: z.string() });
      const handler1 = deepLinkService.createDeepLinkHandler({ schema });
      const handler2 = deepLinkService.createDeepLinkHandler({ schema });

      expect(handler1.id).not.toBe(handler2.id);
    });

    it('should create handler with correct schema', () => {
      const schema = z.object({ foo: z.string() });
      const handler = deepLinkService.createDeepLinkHandler({ schema });

      expect(handler.schema).toBe(schema);
    });

    it('should create handler with triggered event', () => {
      const schema = z.object({ foo: z.string() });
      const handler = deepLinkService.createDeepLinkHandler({ schema });

      expect(handler.triggered).toBeDefined();
      expect(typeof handler.triggered).toBe('function');
    });

    it('should validate data with schema', () => {
      const schema = z.object({ foo: z.string() });
      const handler = deepLinkService.createDeepLinkHandler({ schema });

      expect(handler.validate({ foo: 'bar' })).toEqual({ foo: 'bar' });
      expect(() => handler.validate({ foo: 123 })).toThrow();
    });

    it('should transform data properly', () => {
      const schema = z.object({
        count: z.string().transform(Number),
      });
      const handler = deepLinkService.createDeepLinkHandler({ schema });

      expect(handler.validate({ count: '42' })).toEqual({ count: 42 });
    });
  });

  describe('setDeepLink', () => {
    it('should call callback with matching param keys', async () => {
      const schema = z.object({ test1Param: z.string() });
      const handler = deepLinkService.createDeepLinkHandler({ schema });
      const callback = vi.fn();

      deepLinkService.registerHandler(handler);

      deepLinkService.setDeepLink({ searchParams: new URLSearchParams({ test1Param: 'value1' }), callback });

      expect(callback).toHaveBeenCalledWith(['test1Param']);
    });

    it('should ignore extra params not in schema', async () => {
      const schema = z.object({ test3Param: z.string() });
      const handler = deepLinkService.createDeepLinkHandler({ schema });
      const callback = vi.fn();

      deepLinkService.registerHandler(handler);

      deepLinkService.setDeepLink({
        searchParams: new URLSearchParams({ test3Param: 'value', extraParam: 'ignored' }),
        callback,
      });

      expect(callback).toHaveBeenCalledWith(['test3Param']);
    });

    it('should handle multiple handlers', async () => {
      const schema1 = z.object({ paramA: z.string() });
      const schema2 = z.object({ paramB: z.string() });
      const handler1 = deepLinkService.createDeepLinkHandler({ schema: schema1 });
      const handler2 = deepLinkService.createDeepLinkHandler({ schema: schema2 });
      const callback = vi.fn();

      deepLinkService.registerHandler(handler1);
      deepLinkService.registerHandler(handler2);

      deepLinkService.setDeepLink({
        searchParams: new URLSearchParams({ paramA: 'valueA', paramB: 'valueB', extraParam: 'ignored' }),
        callback,
      });

      expect(callback).toHaveBeenCalledWith(['paramA', 'paramB']);
    });

    it('should call callback with empty array when no params match', async () => {
      const schema = z.object({ test5Param: z.string() });
      const handler = deepLinkService.createDeepLinkHandler({ schema });
      const callback = vi.fn();

      deepLinkService.registerHandler(handler);

      deepLinkService.setDeepLink({
        searchParams: new URLSearchParams({ unmatchedParam2: 'value' }),
        callback,
      });

      expect(callback).toHaveBeenCalledWith([]);
    });

    it('should handle overlapping schemas by consuming params', async () => {
      const schema1 = z.object({ sharedParam: z.string() });
      const schema2 = z.object({ sharedParam: z.string(), otherParam: z.string() });
      const handler1 = deepLinkService.createDeepLinkHandler({ schema: schema1 });
      const handler2 = deepLinkService.createDeepLinkHandler({ schema: schema2 });
      const callback = vi.fn();

      deepLinkService.registerHandler(handler1);
      deepLinkService.registerHandler(handler2);

      deepLinkService.setDeepLink({
        searchParams: new URLSearchParams({ sharedParam: 'value1', otherParam: 'value2' }),
        callback,
      });

      expect(callback).toHaveBeenCalledWith(['sharedParam']);
    });

    it('should handle multiple handlers with distinct params', async () => {
      const schema1 = z.object({ param1: z.string() });
      const schema2 = z.object({ param2: z.string() });
      const handler1 = deepLinkService.createDeepLinkHandler({ schema: schema1 });
      const handler2 = deepLinkService.createDeepLinkHandler({ schema: schema2 });
      const callback = vi.fn();

      deepLinkService.registerHandler(handler1);
      deepLinkService.registerHandler(handler2);

      deepLinkService.setDeepLink({
        searchParams: new URLSearchParams({ param1: 'value1', param2: 'value2' }),
        callback,
      });

      expect(callback).toHaveBeenCalledWith(['param1', 'param2']);
    });
  });

  describe('extractParams', () => {
    it('should extract matching params and return remaining', () => {
      const schema = z.object({ foo: z.string(), bar: z.string() });
      const params = { foo: 'value1', bar: 'value2', baz: 'value3' };

      const result = extractParams(params, schema);

      expect(result.matched).toBe(true);
      expect(result.data).toEqual({ foo: 'value1', bar: 'value2' });
      expect(result.remainingParams).toEqual({ baz: 'value3' });
    });

    it('should return matched false when schema does not match', () => {
      const schema = z.object({ required: z.string() });
      const params = { other: 'value' };

      const result = extractParams(params, schema);

      expect(result.matched).toBe(false);
      expect(result.remainingParams).toEqual({ other: 'value' });
    });

    it('should handle schema with transformations', () => {
      const schema = z.object({
        count: z.string().transform(Number),
        flag: z.string().transform(val => val === 'true'),
      });
      const params = { count: '42', flag: 'true', extra: 'ignored' };

      const result = extractParams(params, schema);

      expect(result.matched).toBe(true);
      expect(result.data).toEqual({ count: 42, flag: true });
      expect(result.remainingParams).toEqual({ extra: 'ignored' });
    });

    it('should handle schema with optional fields', () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });
      const params = { required: 'value', other: 'ignored' };

      const result = extractParams(params, schema);

      expect(result.matched).toBe(true);
      expect(result.data).toEqual({ required: 'value' });
      expect(result.remainingParams).toEqual({ other: 'ignored' });
    });

    it('should handle schema with default values', () => {
      const schema = z.object({
        required: z.string(),
        withDefault: z.string().default('default'),
      });
      const params = { required: 'value' };

      const result = extractParams(params, schema);

      expect(result.matched).toBe(true);
      expect(result.data).toEqual({ required: 'value', withDefault: 'default' });
      expect(result.remainingParams).toEqual({});
    });

    it('should not mutate original params', () => {
      const schema = z.object({ foo: z.string() });
      const params = { foo: 'value', bar: 'other' };
      const originalParams = { ...params };

      extractParams(params, schema);

      expect(params).toEqual(originalParams);
    });
  });

  describe('edge cases', () => {
    it('should handle empty search params', async () => {
      const schema = z.object({ test17Param: z.string() });
      const handler = deepLinkService.createDeepLinkHandler({ schema });
      const callback = vi.fn();

      deepLinkService.registerHandler(handler);

      deepLinkService.setDeepLink({ searchParams: new URLSearchParams(), callback });

      expect(callback).toHaveBeenCalledWith([]);
    });

    it('should handle no handlers registered', async () => {
      const callback = vi.fn();

      deepLinkService.setDeepLink({
        searchParams: new URLSearchParams({ unusedParam: 'value' }),
        callback,
      });

      expect(callback).toHaveBeenCalledWith([]);
    });
  });
});
