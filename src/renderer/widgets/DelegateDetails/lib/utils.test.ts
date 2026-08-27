import { type Identity } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { getIdentityList } from './utils';

const identity = (overrides: Partial<Identity>): Identity => ({
  subName: '',
  email: '',
  twitter: '',
  website: '',
  parent: { accountId: '0x00' as AccountId, name: '' },
  ...overrides,
});

describe('getIdentityList', () => {
  it('wraps twitter and email in fixed schemes', () => {
    expect(getIdentityList(identity({ twitter: 'alice', email: 'a@b.c' }))).toEqual([
      { key: 'Email', value: 'a@b.c', url: 'mailto:a@b.c' },
      { key: 'Twitter', value: 'alice', url: 'https://x.com/alice' },
    ]);
  });

  it('percent-encodes the email parts', () => {
    expect(getIdentityList(identity({ email: 'a+b@c.d' }))).toEqual([
      { key: 'Email', value: 'a+b@c.d', url: 'mailto:a%2Bb@c.d' },
    ]);
  });

  it.each([
    'a@b.c?subject=x',
    'a@b.c&cc=x',
    'a@b.c#x',
    'a@b.c/x',
    'a b@c.d',
    'a@b.c\nbcc:x',
    'no-at-sign',
    'two@at@signs',
    '@b.c',
    'a@',
  ])('drops email %s that is not a bare address', (email) => {
    expect(getIdentityList(identity({ email }))).toEqual([]);
  });

  it('keeps http(s) websites and prefixes scheme-less ones', () => {
    expect(getIdentityList(identity({ website: 'https://alice.io' }))).toEqual([
      { key: 'Website', value: 'https://alice.io', url: 'https://alice.io/' },
    ]);
    expect(getIdentityList(identity({ website: 'alice.io' }))).toEqual([
      { key: 'Website', value: 'alice.io', url: 'https://alice.io/' },
    ]);
  });

  it.each(['file:///etc/passwd', 'smb://evil/share', 'javascript:alert(1)'])('drops website %s', (website) => {
    expect(getIdentityList(identity({ website }))).toEqual([]);
  });

  it('skips empty values and parent', () => {
    expect(getIdentityList(identity({}))).toEqual([]);
  });
});
