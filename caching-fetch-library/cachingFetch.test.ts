import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  preloadCachingFetch,
  serializeCache,
  initializeCache,
  wipeCache,
  useCachingFetch,
} from './cachingFetch';

describe('cachingFetch library', () => {
  const sampleUrl = 'https://example.com/api/people';
  const sampleData = [{ id: 1, name: 'Alice' }];

  beforeEach(() => {
    wipeCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    wipeCache();
  });

  describe('preloadCachingFetch', () => {
    it('fetches data and populates cache', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: async () => sampleData,
      });
      vi.stubGlobal('fetch', mockFetch);

      await preloadCachingFetch(sampleUrl);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(sampleUrl);

      // calling again with same url shouldn't trigger another fetch
      await preloadCachingFetch(sampleUrl);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('serializeCache & initializeCache', () => {
    it('serializes and reloads cache', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: async () => sampleData,
      });
      vi.stubGlobal('fetch', mockFetch);

      await preloadCachingFetch(sampleUrl);
      const serialized = serializeCache();

      expect(typeof serialized).toBe('string');
      expect(JSON.parse(serialized)).toEqual({
        [sampleUrl]: sampleData,
      });

      // wipe and reload
      wipeCache();
      expect(serializeCache()).toBe('{}');

      initializeCache(serialized);
      expect(serializeCache()).toBe(serialized);
    });
  });

  describe('wipeCache', () => {
    it('clears all cached data', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: async () => sampleData,
      });
      vi.stubGlobal('fetch', mockFetch);

      await preloadCachingFetch(sampleUrl);
      expect(serializeCache()).not.toBe('{}');

      wipeCache();
      expect(serializeCache()).toBe('{}');
    });
  });

  describe('useCachingFetch in SSR render', () => {
    it('returns preloaded data immediately during render', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: async () => sampleData,
      });
      vi.stubGlobal('fetch', mockFetch);

      await preloadCachingFetch(sampleUrl);

      const ReactDOMServer = await import('react-dom/server');
      const React = await import('react');

      let captured: ReturnType<typeof useCachingFetch> | null = null;
      const TestComponent = () => {
        captured = useCachingFetch(sampleUrl);
        const list = captured.data as Array<{ id: number; name: string }> | null;
        return React.createElement('div', null, list?.[0]?.name ?? 'empty');
      };

      const html = ReactDOMServer.renderToString(React.createElement(TestComponent));

      expect(html).toContain('Alice');
      expect(captured).not.toBeNull();
      expect(captured!.isLoading).toBe(false);
      expect(captured!.data).toEqual(sampleData);
      expect(captured!.error).toBeNull();
    });

    it('returns isLoading: true when data is not yet in cache', async () => {
      const ReactDOMServer = await import('react-dom/server');
      const React = await import('react');

      let captured: ReturnType<typeof useCachingFetch> | null = null;
      const TestComponent = () => {
        captured = useCachingFetch(sampleUrl);
        return React.createElement('div', null, captured.isLoading ? 'loading' : 'done');
      };

      const html = ReactDOMServer.renderToString(React.createElement(TestComponent));

      expect(html).toContain('loading');
      expect(captured).not.toBeNull();
      expect(captured!.isLoading).toBe(true);
      expect(captured!.data).toBeNull();
      expect(captured!.error).toBeNull();
    });
  });
});
