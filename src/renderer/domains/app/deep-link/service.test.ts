import { createStore, sample } from 'effector';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { deepLinkService } from './service';

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
    it('should set deep link with search params', async () => {
      const schema = z.object({ test1Param: z.string() });
      const handler = deepLinkService.createDeepLinkHandler({ schema });

      const $triggeredData = createStore<unknown>(null);
      sample({
        clock: handler.triggered,
        target: $triggeredData,
      });

      deepLinkService.registerHandler(handler);

      deepLinkService.setDeepLink({ searchParams: new URLSearchParams({ test1Param: 'value1' }) });

      await new Promise(resolve => setTimeout(resolve, 0));

      const result = $triggeredData.getState();
      expect(result).toEqual({ test1Param: 'value1' });
    });

    it('should handle multiple parameters', async () => {
      const schema = z.object({
        test2Param1: z.string(),
        test2Param2: z.string(),
      });
      const handler = deepLinkService.createDeepLinkHandler({ schema });

      const $triggeredData = createStore<unknown>(null);
      sample({
        clock: handler.triggered,
        target: $triggeredData,
      });

      deepLinkService.registerHandler(handler);

      deepLinkService.setDeepLink({ searchParams: new URLSearchParams({ test2Param1: 'value1', test2Param2: 'value2' }) });

      await new Promise(resolve => setTimeout(resolve, 0));

      const result = $triggeredData.getState();
      expect(result).toEqual({ test2Param1: 'value1', test2Param2: 'value2' });
    });

    it('should call callback with taken keys', async () => {
      const schema = z.object({ test3Param: z.string() });
      const handler = deepLinkService.createDeepLinkHandler({ schema });
      const callback = vi.fn();

      deepLinkService.registerHandler(handler);

      deepLinkService.setDeepLink({
        searchParams: new URLSearchParams({ test3Param: 'value', extraParam: 'ignored' }),
        callback,
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(callback).toHaveBeenCalledWith(['test3Param']);
    });

    it('should return parameters taken from multiple handlers', async () => {
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

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(callback).toHaveBeenCalledWith(['paramA', 'paramB']);
    });

    it('should not trigger handler when params do not match schema', async () => {
      const schema = z.object({ test4Param: z.string() });
      const handler = deepLinkService.createDeepLinkHandler({ schema });

      const $triggeredData = createStore<unknown>(null);
      sample({
        clock: handler.triggered,
        target: $triggeredData,
      });

      deepLinkService.registerHandler(handler);

      deepLinkService.setDeepLink({ searchParams: new URLSearchParams({ unmatchedParam: 'value' }) });

      await new Promise(resolve => setTimeout(resolve, 0));

      const result = $triggeredData.getState();
      expect(result).toBeNull();
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

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(callback).toHaveBeenCalledWith([]);
    });
  });

  describe('registerHandler', () => {
    it('should create proper handler and trigger on matching params', async () => {
      const schema = z.object({ test6Param: z.string() });
      const handler = deepLinkService.createDeepLinkHandler({ schema });

      const $triggeredData = createStore<unknown>(null);
      sample({
        clock: handler.triggered,
        target: $triggeredData,
      });

      deepLinkService.registerHandler(handler);

      deepLinkService.setDeepLink({ searchParams: new URLSearchParams({ test6Param: 'value' }) });

      await new Promise(resolve => setTimeout(resolve, 0));

      const result = $triggeredData.getState();
      expect(result).toEqual({ test6Param: 'value' });
    });

    it('should process pending deep link when handler is registered', async () => {
      const schema = z.object({ test7Param: z.string() });
      const handler = deepLinkService.createDeepLinkHandler({ schema });

      const $triggeredData = createStore<unknown>(null);
      sample({
        clock: handler.triggered,
        target: $triggeredData,
      });

      // Set deep link before registering handler
      deepLinkService.setDeepLink({ searchParams: new URLSearchParams({ test7Param: 'value' }) });

      await new Promise(resolve => setTimeout(resolve, 0));

      // Handler not yet registered, should not trigger
      let result = $triggeredData.getState();
      expect(result).toBeNull();

      // Register handler - should process pending deep link
      deepLinkService.registerHandler(handler);

      await new Promise(resolve => setTimeout(resolve, 0));

      result = $triggeredData.getState();
      expect(result).toEqual({ test7Param: 'value' });
    });

    it('should remove handler after triggering', async () => {
      const schema = z.object({ test8Param: z.string() });
      const handler = deepLinkService.createDeepLinkHandler({ schema });

      const $triggeredDataList = createStore<unknown[]>([]);
      sample({
        clock: handler.triggered,
        source: $triggeredDataList,
        fn: (list, data) => [...list, data],
        target: $triggeredDataList,
      });

      deepLinkService.registerHandler(handler);

      deepLinkService.setDeepLink({ searchParams: new URLSearchParams({ test8Param: 'value1' }) });

      await new Promise(resolve => setTimeout(resolve, 0));

      let result = $triggeredDataList.getState();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ test8Param: 'value1' });

      deepLinkService.setDeepLink({ searchParams: new URLSearchParams({ test8Param: 'value2' }) });

      await new Promise(resolve => setTimeout(resolve, 0));

      result = $triggeredDataList.getState();
      // Handler should not be triggered again as it was removed after first trigger
      expect(result).toHaveLength(1);
    });
  });

  describe('multiple handlers', () => {
    it('should handle multiple handlers for different params', async () => {
      const schema1 = z.object({ test9Param: z.string() });
      const schema2 = z.object({ test10Param: z.string() });

      const handler1 = deepLinkService.createDeepLinkHandler({ schema: schema1 });
      const handler2 = deepLinkService.createDeepLinkHandler({ schema: schema2 });

      const $triggeredData1 = createStore<unknown>(null);
      const $triggeredData2 = createStore<unknown>(null);
      sample({
        clock: handler1.triggered,
        target: $triggeredData1,
      });
      sample({
        clock: handler2.triggered,
        target: $triggeredData2,
      });

      deepLinkService.registerHandler(handler1);
      deepLinkService.registerHandler(handler2);

      deepLinkService.setDeepLink({ searchParams: new URLSearchParams({ test9Param: 'value1', test10Param: 'value2' }) });

      await new Promise(resolve => setTimeout(resolve, 0));

      const result1 = $triggeredData1.getState();
      const result2 = $triggeredData2.getState();
      expect(result1).toEqual({ test9Param: 'value1' });
      expect(result2).toEqual({ test10Param: 'value2' });
    });

    it('should only trigger matching handlers', async () => {
      const schema1 = z.object({ test11Param: z.string() });
      const schema2 = z.object({ test12Param: z.string() });

      const handler1 = deepLinkService.createDeepLinkHandler({ schema: schema1 });
      const handler2 = deepLinkService.createDeepLinkHandler({ schema: schema2 });

      const $triggeredData1 = createStore<unknown>(null);
      const $triggeredData2 = createStore<unknown>(null);
      sample({
        clock: handler1.triggered,
        target: $triggeredData1,
      });
      sample({
        clock: handler2.triggered,
        target: $triggeredData2,
      });

      deepLinkService.registerHandler(handler1);
      deepLinkService.registerHandler(handler2);

      deepLinkService.setDeepLink({ searchParams: new URLSearchParams({ test11Param: 'value' }) });

      await new Promise(resolve => setTimeout(resolve, 0));

      const result1 = $triggeredData1.getState();
      const result2 = $triggeredData2.getState();
      expect(result1).toEqual({ test11Param: 'value' });
      expect(result2).toBeNull();
    });

    it('should correctly handle overlapping schemas', async () => {
      const schema1 = z.object({ test13Param: z.string() });
      const schema2 = z.object({ test13Param: z.string(), test14Param: z.string() });

      const handler1 = deepLinkService.createDeepLinkHandler({ schema: schema1 });
      const handler2 = deepLinkService.createDeepLinkHandler({ schema: schema2 });

      const $triggeredData1 = createStore<unknown>(null);
      const $triggeredData2 = createStore<unknown>(null);
      sample({
        clock: handler1.triggered,
        target: $triggeredData1,
      });
      sample({
        clock: handler2.triggered,
        target: $triggeredData2,
      });

      deepLinkService.registerHandler(handler1);
      deepLinkService.registerHandler(handler2);

      deepLinkService.setDeepLink({ searchParams: new URLSearchParams({ test13Param: 'value1', test14Param: 'value2' }) });

      await new Promise(resolve => setTimeout(resolve, 0));

      const result1 = $triggeredData1.getState();
      const result2 = $triggeredData2.getState();
      // First handler should consume 'test13Param', leaving 'test14Param' for the second handler
      expect(result1).toEqual({ test13Param: 'value1' });
      // Second handler won't match because 'test13Param' was already consumed
      expect(result2).toBeNull();
    });

    it('should call callback with all taken keys from multiple handlers', async () => {
      const schema1 = z.object({ test15Param: z.string() });
      const schema2 = z.object({ test16Param: z.string() });

      const handler1 = deepLinkService.createDeepLinkHandler({ schema: schema1 });
      const handler2 = deepLinkService.createDeepLinkHandler({ schema: schema2 });

      const callback = vi.fn();

      deepLinkService.registerHandler(handler1);
      deepLinkService.registerHandler(handler2);

      deepLinkService.setDeepLink({
        searchParams: new URLSearchParams({ test15Param: 'value1', test16Param: 'value2', extraParam2: 'ignored' }),
        callback,
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(callback).toHaveBeenCalledWith(['test15Param', 'test16Param']);
    });
  });

  describe('edge cases', () => {
    it('should handle empty search params', async () => {
      const schema = z.object({ test17Param: z.string() });
      const handler = deepLinkService.createDeepLinkHandler({ schema });

      const $triggeredData = createStore<unknown>(null);
      sample({
        clock: handler.triggered,
        target: $triggeredData,
      });

      deepLinkService.registerHandler(handler);

      deepLinkService.setDeepLink({ searchParams: new URLSearchParams() });

      await new Promise(resolve => setTimeout(resolve, 0));

      const result = $triggeredData.getState();
      expect(result).toBeNull();
    });

    it('should handle schema with optional fields', async () => {
      const schema = z.object({
        test18Param: z.string(),
        test19Param: z.string().optional(),
      });
      const handler = deepLinkService.createDeepLinkHandler({ schema });

      const $triggeredData = createStore<unknown>(null);
      sample({
        clock: handler.triggered,
        target: $triggeredData,
      });

      deepLinkService.registerHandler(handler);

      deepLinkService.setDeepLink({ searchParams: new URLSearchParams({ test18Param: 'value' }) });

      await new Promise(resolve => setTimeout(resolve, 0));

      const result = $triggeredData.getState();
      expect(result).toEqual({ test18Param: 'value' });
    });

    it('should handle schema with default values', async () => {
      const schema = z.object({
        test20Param: z.string(),
        test21Param: z.string().default('default'),
      });
      const handler = deepLinkService.createDeepLinkHandler({ schema });

      const $triggeredData = createStore<unknown>(null);
      sample({
        clock: handler.triggered,
        target: $triggeredData,
      });

      deepLinkService.registerHandler(handler);

      deepLinkService.setDeepLink({ searchParams: new URLSearchParams({ test20Param: 'value' }) });

      await new Promise(resolve => setTimeout(resolve, 0));

      const result = $triggeredData.getState();
      expect(result).toEqual({ test20Param: 'value', test21Param: 'default' });
    });

    it('should handle no handlers registered', () => {
      expect(() => {
        deepLinkService.setDeepLink({ searchParams: new URLSearchParams({ unusedParam: 'value' }) });
      }).not.toThrow();
    });

    it('should handle callback when no handlers match', async () => {
      const callback = vi.fn();

      deepLinkService.setDeepLink({
        searchParams: new URLSearchParams({ unusedParam3: 'value' }),
        callback,
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      // Callback is called with empty array when no handlers match
      expect(callback).toHaveBeenCalledWith([]);
    });

    it('should handle schema with transformations', async () => {
      const schema = z.object({
        test22Param: z.string().transform(Number),
        test23Param: z.string().transform(val => val === 'true'),
      });
      const handler = deepLinkService.createDeepLinkHandler({ schema });

      const $triggeredData = createStore<unknown>(null);
      sample({
        clock: handler.triggered,
        target: $triggeredData,
      });

      deepLinkService.registerHandler(handler);

      deepLinkService.setDeepLink({ searchParams: new URLSearchParams({ test22Param: '42', test23Param: 'true' }) });

      await new Promise(resolve => setTimeout(resolve, 0));

      const result = $triggeredData.getState();
      expect(result).toEqual({ test22Param: 42, test23Param: true });
    });
  });
});
