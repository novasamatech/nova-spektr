import { allSettled, fork } from 'effector';

import { type Contact } from '@/shared/core';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { contactModel } from '@/entities/contact';
import { authModel, backendConfigurationModel } from '../../../BackendConfiguration';
import { contactSourceModel } from '../contact-source-model';

const backendContacts: Contact[] = [
  {
    id: 'backend-1',
    name: 'Backend Contact',
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
];

const localContact: Contact = {
  id: 'local-1',
  name: 'Local Contact',
  address: toAddress('333'),
  accountId: toAccountId('0x03'),
  source: 'local',
};

describe('features/contacts/ContactFilter/model/contact-source-model', () => {
  test('should reset source tab to local when connection is deleted (urlCleared)', async () => {
    const scope = fork({
      values: new Map()
        .set(contactSourceModel.$sourceTab, 'backend')
        .set(contactModel.$contacts, [...backendContacts, localContact])
        .set(backendConfigurationModel.$backendUrl, 'https://backend.example.com'),
      handlers: [[contactModel.effects.clearBackendContactsFx, () => ['backend-1']]],
    });

    expect(scope.getState(contactSourceModel.$sourceTab)).toBe('backend');

    await allSettled(backendConfigurationModel.events.urlCleared, { scope });

    expect(scope.getState(contactSourceModel.$sourceTab)).toBe('local');
  });

  test('should reset source tab to local when disconnecting (signOutClicked)', async () => {
    const scope = fork({
      values: new Map()
        .set(contactSourceModel.$sourceTab, 'backend')
        .set(contactModel.$contacts, [...backendContacts, localContact])
        .set(backendConfigurationModel.$backendUrl, 'https://backend.example.com'),
      handlers: [[authModel.__test.logoutFx, jest.fn().mockResolvedValue(undefined)]],
    });

    expect(scope.getState(contactSourceModel.$sourceTab)).toBe('backend');

    await allSettled(authModel.events.signOutClicked, { scope });

    expect(scope.getState(contactSourceModel.$sourceTab)).toBe('local');
  });

  test('should NOT reset source tab when session expires', async () => {
    const scope = fork({
      values: new Map()
        .set(contactSourceModel.$sourceTab, 'backend')
        .set(contactModel.$contacts, backendContacts)
        .set(backendConfigurationModel.$backendUrl, 'https://backend.example.com'),
    });

    await allSettled(authModel.$isSessionExpired, { scope, params: true });

    expect(scope.getState(contactSourceModel.$sourceTab)).toBe('backend');
  });

  test('should show backend tab when backend contacts exist even without active connection', () => {
    const scope = fork({
      values: new Map()
        .set(contactModel.$contacts, backendContacts)
        .set(backendConfigurationModel.$backendUrl, null)
        .set(authModel.$authState, null),
    });

    const sources = scope.getState(contactSourceModel.$availableSources);
    expect(sources).toHaveLength(2);
    expect(sources[1]!.id).toBe('backend');
  });

  test('should hide backend tab when no backend contacts and no active connection', () => {
    const scope = fork({
      values: new Map()
        .set(contactModel.$contacts, [])
        .set(backendConfigurationModel.$backendUrl, null)
        .set(authModel.$authState, null),
    });

    const sources = scope.getState(contactSourceModel.$availableSources);
    expect(sources).toHaveLength(1);
    expect(sources[0]!.id).toBe('local');
  });
});
