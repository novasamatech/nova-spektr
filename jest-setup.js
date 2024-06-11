import 'whatwg-fetch';
import { TextDecoder, TextEncoder } from 'util';
import crypto from 'crypto';

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  disconnect: jest.fn(),
  observe: jest.fn(),
  unobserve: jest.fn(),
}));

Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => '42',
    getRandomValues: (arr) => crypto.getRandomValues(arr),
  },
});

global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;
