import { allSettled, fork } from 'effector';

import { type BackendContact } from '@/shared/core';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { contactModel } from '@/entities/contact';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';
import { backendContactsModel } from '../backend-contacts-model';

const backendContacts: BackendContact[] = [
  {
    id: 'backend-1',
    name: 'Backend Contact 1',
    address: toAddress('111'),
    accountId: toAccountId('0x01'),
    source: 'backend',
    entityNames: ['Entity A'],
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    chainName: 'Polkadot',
    categoryName: 'Validator',
    contactTypeName: null,
    derivationPath: null,
    ownerAccountId: null,
    signatories: null,
    threshold: null,
    tags: [],
  },
  {
    id: 'backend-2',
    name: 'Backend Contact 2',
    address: toAddress('222'),
    accountId: toAccountId('0x02'),
    source: 'backend',
    entityNames: ['Entity B'],
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    chainName: 'Polkadot',
    categoryName: 'Nominator',
    contactTypeName: null,
    derivationPath: null,
    ownerAccountId: null,
    signatories: null,
    threshold: null,
    tags: [],
  },
];

describe('features/contacts/BackendContacts/model/backend-contacts-model', () => {
  test('should clear backend contacts when connection url is cleared', async () => {
    const scope = fork({
      values: new Map().set(contactModel.$backendContacts, backendContacts),
    });

    expect(scope.getState(contactModel.$backendContacts)).toEqual(backendContacts);

    await allSettled(backendConfigurationModel.events.urlCleared, { scope });

    expect(scope.getState(contactModel.$backendContacts)).toEqual([]);
  });

  test('should clear backend contacts when user signs out', async () => {
    const scope = fork({
      values: new Map()
        .set(contactModel.$backendContacts, backendContacts)
        .set(backendConfigurationModel.$backendUrl, 'https://backend.example.com'),
      handlers: [[authModel.__test.logoutFx, jest.fn().mockResolvedValue(undefined)]],
    });

    await allSettled(authModel.events.signOutClicked, { scope });

    expect(scope.getState(contactModel.$backendContacts)).toEqual([]);
  });

  test('should clear backend contacts when session expires', async () => {
    const scope = fork({
      values: new Map().set(contactModel.$backendContacts, backendContacts),
    });

    await allSettled(authModel.$isSessionExpired, { scope, params: true });

    expect(scope.getState(contactModel.$backendContacts)).toEqual([]);
  });

  test('should NOT clear backend contacts when $isSessionExpired transitions to false', async () => {
    const scope = fork({
      values: new Map()
        .set(contactModel.$backendContacts, backendContacts)
        .set(authModel.$isSessionExpired, true),
    });

    await allSettled(authModel.$isSessionExpired, { scope, params: false });

    expect(scope.getState(contactModel.$backendContacts)).toEqual(backendContacts);
  });

  test('should clear backend contacts on a network/reachability issue', async () => {
    const scope = fork({
      values: new Map().set(contactModel.$backendContacts, backendContacts),
    });

    await allSettled(authModel.$hasNetworkIssue, { scope, params: true });

    expect(scope.getState(contactModel.$backendContacts)).toEqual([]);
  });

  test('should clear backend contacts when fetch fails', async () => {
    const scope = fork({
      values: new Map().set(contactModel.$backendContacts, backendContacts),
      handlers: [
        [
          backendContactsModel.__test.fetchBackendContactsFx,
          jest.fn().mockRejectedValue(new Error('boom')),
        ],
      ],
    });

    await allSettled(backendContactsModel.__test.fetchBackendContactsFx, {
      scope,
      params: 'https://backend.example.com',
    });

    expect(scope.getState(contactModel.$backendContacts)).toEqual([]);
  });

  test('should refetch backend contacts when network issue clears (session still authed)', async () => {
    const fetchSpy = jest.fn().mockResolvedValue([]);

    const scope = fork({
      values: new Map()
        .set(authModel.$hasNetworkIssue, true)
        .set(authModel.$authState, {
          accountId: toAccountId('0x04'),
          accountName: 'Signer',
          permissions: [],
        })
        .set(backendConfigurationModel.$backendUrl, 'https://backend.example.com'),
      handlers: [[backendContactsModel.__test.fetchBackendContactsFx, fetchSpy]],
    });

    await allSettled(authModel.$hasNetworkIssue, { scope, params: false });

    expect(fetchSpy).toHaveBeenCalledWith('https://backend.example.com');
  });

  test('should NOT refetch when network issue clears but no auth state', async () => {
    const fetchSpy = jest.fn().mockResolvedValue([]);

    const scope = fork({
      values: new Map()
        .set(authModel.$hasNetworkIssue, true)
        .set(authModel.$authState, null)
        .set(backendConfigurationModel.$backendUrl, 'https://backend.example.com'),
      handlers: [[backendContactsModel.__test.fetchBackendContactsFx, fetchSpy]],
    });

    await allSettled(authModel.$hasNetworkIssue, { scope, params: false });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
