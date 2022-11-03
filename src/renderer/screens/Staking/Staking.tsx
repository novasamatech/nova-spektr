import { useQuery } from '@apollo/client';
import { ApiPromise } from '@polkadot/api';
import {
  BaseTxInfo,
  construct,
  getRegistry,
  GetRegistryOpts,
  methods,
  OptionsWithMeta,
  TypeRegistry,
} from '@substrate/txwrapper-polkadot';
import { useState } from 'react';

import { QrTxGenerator } from '@renderer/components/common';
import { Command } from '@renderer/components/common/QrCode/QrGenerator/common/constants';
import { Button, Dropdown } from '@renderer/components/ui';
import { OptionType } from '@renderer/components/ui/Dropdown/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { AccountID } from '@renderer/domain/shared-kernel';
import { GET_TOTAL_REWARDS } from '@renderer/graphql/queries/stakingRewards';
import { Rewards } from '@renderer/graphql/types/stakingRewards';

const Staking = () => {
  const { t } = useI18n();

  const { connections } = useNetworkContext();
  const networksApis = Object.values(connections).map(({ name, api }) => ({ label: name, value: api }));

  const [activeNetwork, setActiveNetwork] = useState<OptionType<ApiPromise>>();
  const [eraIndex, setEraIndex] = useState();
  const [qrPayload, setQrPayload] = useState('');
  const [randomValidators, setRandomValidators] = useState<string[]>([]);

  const { data } = useQuery<Rewards>(GET_TOTAL_REWARDS, {
    variables: {
      first: 10,
      address: '111B8CxcmnWbuDLyGvgUmRezDCK1brRZmvUuQ6SrFdMyc3S',
    },
  });

  console.log(data);

  const getEra = async () => {
    // Gets data about epoch and era
    // activeNetwork?.value.derive.session.progress((result) => {
    //   console.log('start => ', sessionInfo?.activeEraStart.toHuman());
    //   console.log('progress => ', sessionInfo?.eraProgress.toHuman());
    //   console.log('length => ', sessionInfo?.eraLength.toHuman());
    // });

    const data = (await activeNetwork?.value.query.staking.activeEra()) as any;
    const unwrappedData = data.unwrap();
    setEraIndex(unwrappedData.get('index').toNumber());
    console.log(unwrappedData.get('index').toHuman(), unwrappedData.get('start').toHuman());
    // 5,761 – "1,667,361,402,002" - Westend
  };

  const getBonded = async () => {
    const data = (await activeNetwork?.value.query.staking.ledger(
      '15hwmZknpCaGffUFKHSLz8wNeQPuhvdD5cc1o1AGiL4QHoU7',
    )) as any;
    const unwrappedData = data.unwrap();
    console.log(unwrappedData.toHuman());
    // active: "2,701,475,935,769" - Westend
    // claimedRewards: ["5,673", "5,674", "5,675", "5,676", "5,677", "5,678", "5,679", "5,680", "5,681", "5,682", …] (84)
    // stash: "5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW"
    // total: "2,701,475,935,769"
    // unlocking: [] (0)
    // unlocking: [{value: "900,000,000,000", era: "911"}] - Filled variant
  };

  const getAllValidators = async () => {
    const data = (await activeNetwork?.value.query.staking.erasStakersClipped.entries(eraIndex)) as any;
    const wholeData = data.map(([storageKey, type]: any[]) => ({
      validator: storageKey.toHuman(),
      value: type.toHuman(),
    }));
    setRandomValidators(wholeData.map((d: any) => d.validator[1]));

    console.log(wholeData);
  };

  const getValidatorsPrefs = async () => {
    const data = (await activeNetwork?.value.query.staking.erasValidatorPrefs.entries(eraIndex)) as any;
    console.log(
      data.map(([storageKey, type]: any[]) => ({
        validator: storageKey.toHuman(),
        prefs: type.toHuman(),
      })),
    );
  };

  const getIdentities = async () => {
    // Polkadot user with SubIdentity - 11uMPbeaEDJhUxzU4ZfWW9VQEsryP9XqFcNRfPdYda6aFWJ
    // ["14QBQABMSFBsT3pDTaEQdshq7ZLmhzKiae2weZH45pw5ErYu", {Raw: "4"}]
    // Raw - subIdentity name
    const data = (await activeNetwork?.value.query.identity.superOf(
      '11uMPbeaEDJhUxzU4ZfWW9VQEsryP9XqFcNRfPdYda6aFWJ',
    )) as any;
    const unwrappedData = data.unwrap();
    console.log(unwrappedData.toHuman());

    // Parent of previous subIdentity - 14QBQABMSFBsT3pDTaEQdshq7ZLmhzKiae2weZH45pw5ErYu
    // const data = (await activeNetwork?.value.query.identity.identityOf(
    //   '14QBQABMSFBsT3pDTaEQdshq7ZLmhzKiae2weZH45pw5ErYu',
    // )) as any;
    // const unwrappedData = data.unwrap();
    // console.log(unwrappedData.toHuman());
  };

  const getMaxValidators = () => {
    const data = activeNetwork?.value.consts.staking.maxNominations;
    console.log(data?.toHuman());
  };

  const offlineTxMetadata = async (
    accountId: AccountID,
    chainName: string,
    api: ApiPromise,
  ): Promise<{ registry: TypeRegistry; options: OptionsWithMeta; info: BaseTxInfo }> => {
    const { block } = await api.rpc.chain.getBlock();
    const blockHash = await api.rpc.chain.getBlockHash();
    const genesisHash = await api.rpc.chain.getBlockHash(0);
    const metadataRpc = await api.rpc.state.getMetadata();
    const { nonce } = await api.query.system.account(accountId);
    const { specVersion, transactionVersion, specName } = await api.rpc.state.getRuntimeVersion();

    const registry = getRegistry({
      chainName,
      specName: specName.toString() as GetRegistryOpts['specName'],
      specVersion: specVersion.toNumber(),
      metadataRpc: metadataRpc.toHex(),
    });

    const info: BaseTxInfo = {
      address: accountId,
      blockHash: blockHash.toString(),
      blockNumber: block.header.number.toNumber(),
      eraPeriod: 64,
      genesisHash: genesisHash.toString(),
      metadataRpc: metadataRpc.toHex(),
      nonce: nonce.toNumber(),
      specVersion: specVersion.toNumber(),
      transactionVersion: transactionVersion.toNumber(),
      tip: 0,
    };

    const options: OptionsWithMeta = { metadataRpc: metadataRpc.toHex(), registry };

    return { options, info, registry };
  };

  const bondAndNominate = async () => {
    if (!activeNetwork) return;

    const address = '5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW';
    const { registry, options, info } = await offlineTxMetadata(address, activeNetwork?.label, activeNetwork?.value);

    const unsignedRemark = methods.staking.nominate({ targets: randomValidators }, info, options);
    const unsignedBond = methods.staking.bond(
      { value: '1000000000000', payee: 'Stash', controller: address },
      info,
      options,
    );
    const unsignedBatch = methods.utility.batchAll(
      { calls: [unsignedBond.method, unsignedRemark.method] },
      info,
      options,
    );
    const signingPayload = construct.signingPayload(unsignedBatch, { registry });

    setQrPayload(signingPayload);
  };

  const bondExtra = async () => {
    if (!activeNetwork) return;

    const address = '5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW';
    const { registry, options, info } = await offlineTxMetadata(address, activeNetwork?.label, activeNetwork?.value);

    const unsignedBondExtra = methods.staking.bondExtra({ maxAdditional: '1000000000000' }, info, options);
    const signingPayload = construct.signingPayload(unsignedBondExtra, { registry });

    setQrPayload(signingPayload);
  };

  // https://polkadot.js.org/docs/substrate/extrinsics#unbondvalue-compactu128
  // Has some additional conditions
  const unbond = async () => {
    if (!activeNetwork) return;

    const address = '5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW';
    const { registry, options, info } = await offlineTxMetadata(address, activeNetwork?.label, activeNetwork?.value);

    // Must be used in batchAll([chill, unbond]) if we are going below InsufficientBond value
    // "If a user encounters the InsufficientBond error when calling this extrinsic,
    // they should call chill first in order to free up their bonded funds."
    // const unsignedChill = methods.staking.chill({}, info, options);
    const unsignedUnbond = methods.staking.unbond({ value: '100000000000' }, info, options);
    const signingPayload = construct.signingPayload(unsignedUnbond, { registry });

    setQrPayload(signingPayload);
  };

  const withdrawUnbonded = async () => {
    if (!activeNetwork) return;

    const address = '5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW';
    const { registry, options, info } = await offlineTxMetadata(address, activeNetwork?.label, activeNetwork?.value);

    const unsignedWithdraw = methods.staking.withdrawUnbonded({ numSlashingSpans: 1 }, info, options);
    const signingPayload = construct.signingPayload(unsignedWithdraw, { registry });

    setQrPayload(signingPayload);
  };

  const rebond = async () => {
    if (!activeNetwork) return;

    const address = '5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW';
    const { registry, options, info } = await offlineTxMetadata(address, activeNetwork?.label, activeNetwork?.value);

    const unsignedRebond = methods.staking.rebond({ value: '100000000000' }, info, options);
    const signingPayload = construct.signingPayload(unsignedRebond, { registry });

    setQrPayload(signingPayload);
  };

  const getRewards = () => {
    console.log(1);
  };

  return (
    <div className="h-full flex flex-col">
      <h1 className="font-semibold text-2xl text-neutral mb-9">{t('staking.title')}</h1>
      <Dropdown
        className="w-[200px]"
        placeholder="Select network"
        selected={activeNetwork}
        options={networksApis}
        onSelected={setActiveNetwork}
      />
      <div className="flex gap-x-2.5 mt-5">
        <Button variant="fill" pallet="alert" onClick={getRewards}>
          Get rewards history
        </Button>
        <Button variant="fill" pallet="primary" onClick={getEra}>
          Get era
        </Button>
        <Button variant="fill" pallet="primary" onClick={getBonded}>
          Get bonded
        </Button>
        <Button variant="fill" pallet="primary" onClick={getAllValidators}>
          Get all validators
        </Button>
        <Button variant="fill" pallet="primary" onClick={getValidatorsPrefs}>
          Get validators prefs
        </Button>
        <Button variant="fill" pallet="primary" onClick={getIdentities}>
          Get identities
        </Button>
        <Button variant="fill" pallet="primary" onClick={getMaxValidators}>
          Get max validators
        </Button>
      </div>
      <div className="flex gap-x-2.5 mt-5">
        <Button variant="outline" pallet="primary" onClick={bondAndNominate}>
          Bond + Nominate
        </Button>
        <Button variant="outline" pallet="primary" onClick={bondExtra}>
          Bond extra
        </Button>
        <Button variant="outline" pallet="primary" onClick={unbond}>
          Unbond
        </Button>
        <Button variant="outline" pallet="primary" onClick={withdrawUnbonded}>
          Withdraw unbonded
        </Button>
        <Button variant="outline" pallet="primary" onClick={rebond}>
          Rebond
        </Button>
      </div>

      <div className="mt-4 w-max text-center">
        {qrPayload ? (
          <QrTxGenerator
            size={300}
            address="5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW"
            cmd={Command.Transaction}
            payload={qrPayload}
            genesisHash="0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e"
          />
        ) : (
          <div className="w-[300px] h-[300px] bg-shade-40 rounded-2lg" />
        )}
        <p className="mt-2">Scan QR code in Parity Signer</p>
      </div>
    </div>
  );
};

export default Staking;
