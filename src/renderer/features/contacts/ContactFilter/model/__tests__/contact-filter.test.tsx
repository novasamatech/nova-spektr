import { allSettled, fork } from 'effector';

import { filterModel } from '../contact-filter';
import { contactModel } from '@entities/contact';

const mockContact1 = {
  id: 1,
  name: 'name 1',
  address: '222',
  accountId: '0x333',
  matrixId: '@444',
};

const mockContact2 = {
  id: 5,
  name: 'name 6',
  address: '777',
  accountId: '0x888',
  matrixId: '@999',
};

const getScopeByQuery = () => {
  return fork({
    values: new Map().set(contactModel.$contacts, [mockContact1, mockContact2]),
  });
};

describe('features/contacts/model/contact-filter-model', () => {
  test('should return all contacts if no search query', async () => {
    const scope = getScopeByQuery();

    allSettled(filterModel.events.formInitiated, { scope });
    expect(scope.getState(filterModel.$contactsFiltered)).toHaveLength(2);
  });

  test('should return nothing if there is no match', async () => {
    const scope = getScopeByQuery();

    allSettled(filterModel.events.formInitiated, { scope });
    allSettled(filterModel.events.queryChanged, { scope, params: 'nothing' });

    expect(scope.getState(filterModel.$contactsFiltered)).toHaveLength(0);
  });

  test('should search by name', async () => {
    const scope = getScopeByQuery();

    allSettled(filterModel.events.formInitiated, { scope });
    allSettled(filterModel.events.queryChanged, { scope, params: mockContact1.name });

    expect(scope.getState(filterModel.$contactsFiltered)).toHaveLength(1);
    expect(scope.getState(filterModel.$contactsFiltered)[0].id).toBe(mockContact1.id);
  });

  test('should search by address', async () => {
    const scope = getScopeByQuery();

    allSettled(filterModel.events.formInitiated, { scope });
    allSettled(filterModel.events.queryChanged, { scope, params: mockContact1.address });

    expect(scope.getState(filterModel.$contactsFiltered)).toHaveLength(1);
    expect(scope.getState(filterModel.$contactsFiltered)[0].id).toBe(mockContact1.id);
  });

  test('should search by matrix id', async () => {
    const scope = getScopeByQuery();

    allSettled(filterModel.events.formInitiated, { scope });
    allSettled(filterModel.events.queryChanged, { scope, params: mockContact2.matrixId });

    expect(scope.getState(filterModel.$contactsFiltered)).toHaveLength(1);
    expect(scope.getState(filterModel.$contactsFiltered)[0].id).toBe(mockContact2.id);
  });
});
