import { useEffect, useRef, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { Address, Block, Button, ButtonBack, Dropdown, Icon, Input, Plate } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { createMultisigAccount, getMultisigAddress, MultisigAccount } from '@renderer/domain/account';
import { Signatory } from '@renderer/domain/signatory';
import { useToggle } from '@renderer/shared/hooks';
import { useAccount } from '@renderer/services/account/accountService';
import { useMatrix } from '@renderer/context/MatrixContext';
import { RoomParams } from '@renderer/services/matrix';
import SelectContactsModal from './SelectContactsModal';
import Settings from '../Settings';
import { Message } from '@renderer/shared/components';
import { DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { PublicKey } from '@renderer/domain/shared-kernel';

type MultisigAccountForm = {
  name: string;
  threshold: DropdownResult<number>;
};

const CreateMultisigAccount = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [isSuccessMessageOpen, toggleSuccessMessage] = useToggle(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAddSignatoryModalOpen, toggleAddSignatoryModal] = useToggle(false);
  const roomId = useRef<string>();

  const { getLiveAccounts, addAccount } = useAccount();
  const accounts = getLiveAccounts();
  const { matrix, isLoggedIn } = useMatrix();

  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
  } = useForm<MultisigAccountForm>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      threshold: { id: '2', value: 2 },
    },
  });

  const threshold = watch('threshold');

  const removeSignatory = (id: number) => {
    setSignatories((s) => s.filter((_, i) => i !== id));
  };

  const cancelRoomCreation = () => {
    if (!roomId.current) return;

    matrix.cancelRoomCreation(roomId.current);
  };

  useEffect(() => cancelRoomCreation(), []);

  const startRoomCreation = async (mstAccountAddress: string): Promise<PublicKey | undefined> => {
    const inviter = signatories.find((a) => a.matrixId === matrix.userId);

    // Create room only if I'm a signatory
    if (!inviter || !inviter.publicKey) return;

    const newRoomId = await matrix.startRoomCreation(mstAccountAddress);

    roomId.current = newRoomId;

    return inviter.publicKey;
  };

  const finishRoomCreation = async (mstAccount: MultisigAccount, inviter: PublicKey) => {
    const roomParams: RoomParams = {
      roomId: roomId.current || '',
      inviterPublicKey: inviter || '',
      accountName: mstAccount.name || '',
      accountId: mstAccount.accountId || '',
      signatories,
      threshold: mstAccount.threshold || 0,
    };

    await matrix.finishRoomCreation(roomParams);
  };

  const onCreateAccount: SubmitHandler<MultisigAccountForm> = async ({ name, threshold }) => {
    setIsLoading(true);

    try {
      const multisigAccount = createMultisigAccount({
        name,
        signatories,
        threshold: threshold.value,
        creator: '',
        matrixRoomId: '',
      });

      if (!multisigAccount.accountId) return;

      const inviter = await startRoomCreation(multisigAccount.accountId);
      multisigAccount.matrixRoomId = roomId.current || '';

      if (!inviter) return;

      await finishRoomCreation(multisigAccount, inviter);
      addAccount(multisigAccount);

      toggleSuccessMessage();
    } catch (error: any) {
      setErrorMessage(error?.message || t('createMultisigAccount.errorMessage'));
    }

    setIsLoading(false);
  };

  const thresholdOptions =
    signatories.length > 0
      ? Array(signatories.length - 1)
          .fill(null)
          .map((_, i) => {
            const index = (i + 2).toString();

            return {
              id: index,
              element: index,
              value: index,
            };
          })
      : [];

  const multisigAccountId =
    threshold &&
    signatories &&
    getMultisigAddress(
      signatories.map((s) => s.accountId),
      threshold.value,
    );

  const hasOwnSignatory = signatories.some((s) => accounts.find((a) => a.publicKey === s.publicKey));
  const hasTwoSignatories = signatories.length > 1;
  const accountAlreadyExists = accounts.find((a) => a.accountId === multisigAccountId);

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
          <Block className="flex flex-col gap-y-2.5">
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
                        disabled={isLoading}
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

                <div className="flex flex-wrap gap-1">
                  {signatories.map((s, i) => (
                    <div key={s.accountId} className="flex pr-0 pl-2 bg-shade-5 h-10 items-center rounded-2lg w-fit">
                      <Address address={s.accountId} name={s.name} />

                      <Button variant="text" pallet="error" onClick={() => removeSignatory(i)}>
                        <Icon className="rotate-45" size={24} name="add" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    className="w-fit"
                    weight="lg"
                    prefixElement={<Icon name="emptyIdenticon" />}
                    suffixElement={<Icon name="add" />}
                    pallet="shade"
                    variant="dashed"
                    disabled={isLoading}
                    onClick={toggleAddSignatoryModal}
                  >
                    {t('createMultisigAccount.addSignatoryButton')}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xl font-semibold text-neutral">{t('createMultisigAccount.nameLabel')}</p>
                  <p className="text-neutral-variant">{t('createMultisigAccount.nameDescription')}</p>
                </div>

                <Controller
                  name="threshold"
                  control={control}
                  rules={{ required: true }}
                  render={({ field: { value, onChange }, fieldState: { error } }) => (
                    <Dropdown
                      variant="up"
                      placeholder=""
                      activeId={value.value.toString()}
                      disabled={signatories.length < 2 || isLoading}
                      options={thresholdOptions}
                      className="w-20"
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

            {isLoading ? (
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
          {t('createMultisigAccount.successMessage')}
        </div>
      </Message>

      <Message isOpen={Boolean(errorMessage)} onClose={() => setErrorMessage('')}>
        <div className="flex uppercase items-center gap-2.5">
          <Icon name="warnCutout" size={20} className="text-error" />
          {errorMessage}
        </div>
      </Message>
    </div>
  );
};

export default CreateMultisigAccount;
