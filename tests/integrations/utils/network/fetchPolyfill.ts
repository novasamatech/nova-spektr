import { type IncomingMessage } from 'http';
import { get } from 'https';

/**
 * Creates a Node.js-based fetch polyfill that uses the https module to avoid
 * CORS restrictions in test environments like happy-dom.
 *
 * This is necessary because happy-dom's fetch implementation enforces CORS
 * policies that prevent fetching from external URLs.
 *
 * @returns A fetch function that works without CORS restrictions
 */
export function createNodeFetchPolyfill(): typeof globalThis.fetch {
  return async (url: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;

    return new Promise((resolve, reject) => {
      const request = get(urlString, (response: IncomingMessage) => {
        const statusCode = response.statusCode || 200;
        const headers = new Headers();
        for (const [key, value] of Object.entries(response.headers)) {
          if (value) {
            headers.set(key, Array.isArray(value) ? value.join(', ') : value);
          }
        }

        let data = '';
        const dataHandler = (chunk: Buffer) => {
          data += chunk.toString();
        };
        const endHandler = () => {
          const responseObj = new Response(data, {
            status: statusCode,
            statusText: response.statusMessage || 'OK',
            headers,
          });
          resolve(responseObj);
        };

        response.on('data', dataHandler);
        response.on('end', endHandler);
      });

      const errorHandler = (error: Error) => {
        reject(error);
      };
      request.on('error', errorHandler);
    });
  };
}

/**
 * Sets up a Node.js-based fetch polyfill globally to avoid CORS issues in test
 * environments. This should be called before any code that uses fetch.
 *
 * @returns A function to restore the original fetch
 */
export function setupFetchPolyfill(): () => void {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createNodeFetchPolyfill();

  // Return restore function
  return () => {
    globalThis.fetch = originalFetch;
  };
}
