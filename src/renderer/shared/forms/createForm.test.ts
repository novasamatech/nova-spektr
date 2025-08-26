import { allSettled, fork } from 'effector';

import { createForm } from './createForm';

describe('createForm', () => {
  it('should change value', async () => {
    type Form = {
      name: string;
    };

    const scope = fork();
    const form = createForm<Form>({
      fields: {
        name: { defaultValue: 'Alice' },
      },
    });

    expect(scope.getState(form.fields.name.$value)).toEqual('Alice');
    await allSettled(form.fields.name.change, { scope, params: 'Bob' });
    expect(scope.getState(form.fields.name.$value)).toEqual('Bob');

    expect(scope.getState(form.$values)).toEqual({
      name: 'Bob',
    });
  });

  it('should validate', async () => {
    type Form = {
      amount: number;
      name: string;
    };

    const scope = fork();
    const form = createForm<Form>({
      fields: {
        amount: {
          defaultValue: 0,
          validator: () => (value) => {
            if (value <= 100) {
              return {
                message: 'Number must be greater than 100',
              };
            }
          },
        },
        name: {
          defaultValue: '',
          validator: () => (value) => {
            if (value.length < 1) {
              return {
                message: 'String must contain at least 1 character',
              };
            }
          },
        },
      },
    });

    await allSettled(form.validate, { scope });

    expect(scope.getState(form.fields.amount.$errors)).toEqual([{ message: 'Number must be greater than 100' }]);
    expect(scope.getState(form.fields.name.$errors)).toEqual([{ message: 'String must contain at least 1 character' }]);

    await allSettled(form.fields.amount.change, { scope, params: 200 });
    await allSettled(form.validate, { scope });

    expect(scope.getState(form.fields.amount.$errors)).toEqual([]);
    expect(scope.getState(form.fields.name.$errors)).toEqual([{ message: 'String must contain at least 1 character' }]);
  });

  it('should validate on change', async () => {
    type Form = {
      name: string;
    };

    const scope = fork();
    const form = createForm<Form>({
      validateOn: ['change'],
      fields: {
        name: {
          defaultValue: '',
          validator: () => (value) => {
            if (value.length < 4) {
              return {
                message: 'String must contain at least 4 characters',
              };
            }
          },
        },
      },
    });

    await allSettled(form.fields.name.change, { scope, params: 'Bob' });
    expect(scope.getState(form.fields.name.$errors)).toEqual([
      { message: 'String must contain at least 4 characters' },
    ]);

    await allSettled(form.fields.name.change, { scope, params: 'Alice' });
    expect(scope.getState(form.fields.name.$errors)).toEqual([]);
  });
});
