import { describe, expect, it } from 'vitest';

import { getMessageText } from '../message-text';

describe('getMessageText', () => {
  it('returns the text exactly as encoded, wrapper tags and line breaks included', () => {
    const text = '<Bytes>CONTEXT v2\norigin: https://ab.example.com\nnonce: 0x01</Bytes>';

    expect(getMessageText(new TextEncoder().encode(text))).toBe(text);
  });

  it('returns hex for bytes that are not valid UTF-8', () => {
    expect(getMessageText(new Uint8Array([0xff, 0xfe, 0x00, 0x41]))).toBe('0xfffe0041');
  });
});
