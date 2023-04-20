import { useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { ChainAddress, Block, Button, ButtonBack, Dropdown, Icon, Input, Plate } from '@renderer/components/ui';
import { createMultisigAccount, getMultisigAccountId, MultisigAccount } from '@renderer/domain/account';
import { useI18n } from '@renderer/context/I18nContext';
import { Signatory } from '@renderer/domain/signatory';
import { useToggle } from '@renderer/shared/hooks';
import { useAccount } from '@renderer/services/account/accountService';
import { useMatrix } from '@renderer/context/MatrixContext';
import { Message } from '@renderer/components/common';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import SelectContactsModal from './SelectContactsModal';
import Settings from '../Settings';

type MultisigAccountForm = {
  name: string;
  threshold: DropdownResult<number>;
};

const getThresholdOptions = (optionsAmount: number): DropdownOption<number>[] => {
  if (optionsAmount === 0) return [];

  return Array.from({ length: optionsAmount }, (_, index) => ({
    id: index.toString(),
    element: index + 2,
    value: index + 2,
  }));
};

const CreateMultisigAccount = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { matrix, isLoggedIn } = useMatrix();
  const { getLiveAccounts, addAccount } = useAccount();
  const accounts = getLiveAccounts();

  const [isSuccessMessageOpen, toggleSuccessMessage] = useToggle();
  const [isAddSignatoryModalOpen, toggleAddSignatoryModal] = useToggle();
  const [inProgress, toggleInProgress] = useToggle();

  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
  } = useForm<MultisigAccountForm>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      threshold: { id: '0', value: 2 },
    },
  });

  const threshold = watch('threshold');

  const removeSignatory = (id: number) => {
    setSignatories((s) => s.filter((_, index) => index !== id));
  };

  const onCreateAccount: SubmitHandler<MultisigAccountForm> = async ({ name, threshold }) => {
    toggleInProgress();

    const inviter = signatories.find((s) => s.matrixId === matrix.userId);
    if (!inviter) return;

    const mstAccount = createMultisigAccount({
      name,
      signatories,
      threshold: threshold.value,
      creatorAccountId: inviter.accountId,
      matrixRoomId: '',
    });

    if (!mstAccount.accountId) return;

    try {
      const matrixRoomId = await matrix.createRoom({
        creatorAccountId: inviter.accountId,
        accountName: mstAccount.name,
        accountId: mstAccount.accountId,
        threshold: mstAccount.threshold,
        signatories: signatories.map(({ accountId, matrixId }) => ({ accountId, matrixId })),
      });
      await addAccount<MultisigAccount>({ ...mstAccount, matrixRoomId });

      toggleSuccessMessage();
    } catch (error: any) {
      setErrorMessage(error?.message || t('createMultisigAccount.errorMessage'));
    }

    toggleInProgress();
  };

  const thresholdOptions = getThresholdOptions(signatories.length - 1);

  const multisigAccountId = getMultisigAccountId(
    signatories.map((s) => s.accountId),
    threshold.value,
  );

  const hasOwnSignatory = signatories.some((s) => accounts.find((a) => a.accountId === s.accountId));
  const accountAlreadyExists = accounts.find((a) => a.accountId === multisigAccountId);
  const hasTwoSignatories = signatories.length > 1;

  const signatoriesAreValid = hasOwnSignatory && hasTwoSignatories && !accountAlreadyExists;

  const onSelectContacts = (signatories: Signatory[]) => {
    setSignatories((s) => s.concat(signatories));
  };

  if (!isLoggedIn) {
    return (
      <Settings.Matrix
        title={<h1 className="font-semibold text-2xl text-neutral"> {t('createMultisigAccount.title')}</h1>}
      />
    );
  }

  return (
    <div className="h-full flex flex-col gap-y-9 relative">
      <div className="flex items-center gap-x-2.5 mt-5 px-5">
        <ButtonBack>
          <h1 className="font-semibold text-2xl text-neutral"> {t('createMultisigAccount.title')}</h1>
        </ButtonBack>
      </div>

      <div className="overflow-y-auto flex-1">
        <Plate as="section" className="mx-auto w-[800px]">
          <Block className="flex flex-col gap-y-2.5 p-5">
            <form id="multisigForm" className="flex flex-col my-3 gap-20" onSubmit={handleSubmit(onCreateAccount)}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xl font-semibold text-neutral">{t('createMultisigAccount.nameLabel')}</p>
                  <p className="text-neutral-variant">{t('createMultisigAccount.nameDescription')}</p>
                </div>

                <div className="flex-1">
                  <Controller
                    name="name"
                    control={control}
                    rules={{ required: true }}
                    render={({ field: { value, onChange }, fieldState: { error } }) => (
                      <Input
                        placeholder={t('createMultisigAccount.namePlaceholder')}
                        invalid={!!error}
                        value={value}
                        disabled={inProgress}
                        onChange={onChange}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div className="mb-5">
                  <p className="text-xl font-semibold text-neutral">{t('createMultisigAccount.signatoriesLabel')}</p>
                  <p className="text-neutral-variant">{t('createMultisigAccount.signatoriesDescription')}</p>
                </div>

                <ul className="flex flex-wrap gap-1">
                  {signatories.map((signatory, index) => (
                    <li key={signatory.accountId} className="flex pl-2 bg-shade-5 h-10 items-center rounded-2lg w-fit">
                      <ChainAddress address={signatory.address} name={signatory.name} size={24} />

                      <Button variant="text" pallet="error" onClick={() => removeSignatory(index)}>
                        <Icon className="rotate-45" name="add" />
                      </Button>
                    </li>
                  ))}

                  <Button
                    className="w-fit"
                    weight="lg"
                    prefixElement={<Icon name="emptyIdenticon" />}
                    suffixElement={<Icon name="add" />}
                    pallet="shade"
                    variant="dashed"
                    disabled={inProgress}
                    onClick={toggleAddSignatoryModal}
                  >
                    {t('createMultisigAccount.addSignatoryButton')}
                  </Button>
                </ul>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xl font-semibold text-neutral">{t('createMultisigAccount.thresholdName')}</p>
                  <p className="text-neutral-variant">{t('createMultisigAccount.thresholdDescription')}</p>
                </div>

                <Controller
                  name="threshold"
                  control={control}
                  rules={{ required: true }}
                  render={({ field: { value, onChange } }) => (
                    <Dropdown
                      variant="up"
                      placeholder="2"
                      className="w-20"
                      activeId={value.id.toString()}
                      disabled={signatories.length < 2 || inProgress}
                      options={thresholdOptions}
                      onChange={onChange}
                    />
                  )}
                />
              </div>
            </form>
          </Block>
          <div className="flex mt-5 w-full justify-between">
            <Button variant="outline" pallet="primary" weight="lg" onClick={() => navigate(-1)}>
              {t('createMultisigAccount.backButton')}
            </Button>

            {inProgress ? (
              <div className="flex items-center justify-center h-10 w-20 border border-shade-40 rounded-2lg">
                <Icon className="text-shade-40 animate-spin" name="loader" size={20} />
              </div>
            ) : (
              <Button
                form="multisigForm"
                variant="fill"
                pallet="primary"
                weight="lg"
                type="submit"
                disabled={!isValid || !signatoriesAreValid}
              >
                {t('createMultisigAccount.continueButton')}
              </Button>
            )}
          </div>
        </Plate>
      </div>

      <SelectContactsModal
        isOpen={isAddSignatoryModalOpen}
        signatories={signatories}
        onSelect={onSelectContacts}
        onClose={toggleAddSignatoryModal}
      />

      <Message
        isOpen={isSuccessMessageOpen}
        onClose={() => {
          toggleSuccessMessage();
          navigate(-1);
        }}
      >
        <div className="flex uppercase items-center gap-2.5">
          <Icon name="checkmarkCutout" size={20} className="text-success" />
          <p className="flex-1">{t('createMultisigAccount.successMessage')}</p>
        </div>
      </Message>

      <Message isOpen={Boolean(errorMessage)} onClose={() => setErrorMessage('')}>
        <div className="flex uppercase items-center gap-2.5">
          <Icon name="warnCutout" size={20} className="text-error" />
          <p className="flex-1">{errorMessage}</p>
        </div>
      </Message>
    </div>
  );
};

export default CreateMultisigAccount;
