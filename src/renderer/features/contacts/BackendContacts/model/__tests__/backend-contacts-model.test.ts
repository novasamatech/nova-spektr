import { allSettled, fork } from 'effector';

import { type Contact } from '@/shared/core';
import { contactModel } from '@/entities/contact';
import { authModel, backendConfigurationModel } from '../../../BackendConfiguration';

import '../backend-contacts-model';

const backendContacts: Contact[] = [
  {
    id: 'backend-1',
    name: 'Backend Contact 1',
    address: '111',
    accountId: '0x01',
    source: 'backend',
    entityNames: ['Entity A'],
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    chainName: 'Polkadot',
    categoryName: 'Validator',
    contactTypeName: null,
    derivationPath: null,
    ownerAccountId: null,
  },
  {
    id: 'backend-2',
    name: 'Backend Contact 2',
    address: '222',
    accountId: '0x02',
    source: 'backend',
    entityNames: ['Entity B'],
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    chainName: 'Polkadot',
    categoryName: 'Nominator',
    contactTypeName: null,
    derivationPath: null,
    ownerAccountId: null,
  },
];

const localContact: Contact = {
  id: 'local-1',
  name: 'Local Contact',
  address: '333',
  accountId: '0x03',
  source: 'local',
};

describe('features/contacts/BackendContacts/model/backend-contacts-model', () => {
  test('should clear backend contacts when connection is deleted (urlCleared)', async () => {
    const clearSpy = jest.fn().mockResolvedValue(['backend-1', 'backend-2']);

    const scope = fork({
      values: new Map().set(contactModel.$contacts, [...backendContacts, localContact]),
      handlers: [[contactModel.effects.clearBackendContactsFx, clearSpy]],
    });

    await allSettled(backendConfigurationModel.events.urlCleared, { scope });

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(scope.getState(contactModel.$contacts)).toEqual([localContact]);
  });

  test('should NOT clear backend contacts when disconnecting (signOutClicked)', async () => {
    const clearSpy = jest.fn().mockResolvedValue([]);

    const scope = fork({
      values: new Map()
        .set(contactModel.$contacts, [...backendContacts, localContact])
        .set(backendConfigurationModel.$backendUrl, 'https://backend.example.com'),
      handlers: [
        [contactModel.effects.clearBackendContactsFx, clearSpy],
        [authModel.__test.logoutFx, jest.fn().mockResolvedValue(undefined)],
      ],
    });

    await allSettled(authModel.events.signOutClicked, { scope });

    expect(clearSpy).not.toHaveBeenCalled();
    expect(scope.getState(contactModel.$backendContacts)).toEqual(backendContacts);
  });

  test('should NOT clear backend contacts when session expires', async () => {
    const clearSpy = jest.fn().mockResolvedValue([]);

    const scope = fork({
      values: new Map().set(contactModel.$contacts, [...backendContacts, localContact]),
      handlers: [[contactModel.effects.clearBackendContactsFx, clearSpy]],
    });

    await allSettled(authModel.$isSessionExpired, { scope, params: true });

    expect(clearSpy).not.toHaveBeenCalled();
    expect(scope.getState(contactModel.$backendContacts)).toEqual(backendContacts);
  });

  test('should preserve local contacts when connection is deleted', async () => {
    const clearSpy = jest.fn().mockResolvedValue(['backend-1', 'backend-2']);

    const scope = fork({
      values: new Map().set(contactModel.$contacts, [...backendContacts, localContact]),
      handlers: [[contactModel.effects.clearBackendContactsFx, clearSpy]],
    });

    await allSettled(backendConfigurationModel.events.urlCleared, { scope });

    expect(scope.getState(contactModel.$localContacts)).toEqual([localContact]);
  });
});
