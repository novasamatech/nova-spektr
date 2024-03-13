import { createEvent, createStore } from 'effector';
import { createForm } from 'effector-forms';
import { Chain, MultisigAccount, Account } from '@shared/core';

const formInitiated = createEvent();
const formSubmitted = createEvent();

const myselfClicked = createEvent();

const $canSubmit = createStore<boolean>(true);
const $signatories = createStore<any[]>([]);
const $isMultisig = createStore<boolean>(true);

const $transferForm = createForm({
  fields: {
    accounts: {
      init: [] as Account[],
    },
    signatory: {
      init: {} as MultisigAccount,
    },
    chain: {
      init: {} as Chain,
    },
    destination: {
      init: '',
    },
    amount: {
      init: '',
    },
    description: {
      init: '',
    },
  },
  validateOn: ['submit'],
});

export const formModel = {
  $transferForm,
  $signatories,
  $isMultisig,

  $canSubmit,
  events: {
    formInitiated,
    myselfClicked,
  },
  output: {
    formSubmitted,
  },
};
