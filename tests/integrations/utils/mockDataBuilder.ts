const accountIds = [
  '0x6e9c89561fd4af9ed7d90c32d2b0bc88f8264df518d673d48b892ab82803511b',
  '0xe444006d851071d23a8673685fbf3727bab5852444927b559930cc124e676317',
  '0xfa2eaa53960b78b46dfe80040d09c96533ecd67b1575e5b04ca5e5b49400053b',
  '0x1676eee33ffd36a78ead79f626a1c0bb8423bf5fae4e1d55ea06bcb1ca285f49',
  '0xb020de949c86c115967a30a953ae1eda40eefb8de94d7ee92b806951c06e3669',
  '0xe26f07acdbacce313aab46f93419f66e752f24be5e5f30390774f19d0ef2790e',
  '0x5494704f70a59e2cbb63fba4c8bed9443efe4f099352f3d8f7dfefcbdfc17f65',
];

const addresses = [
  '5EZjdEWdQEDnR22VcxKWTGTs4r9437HCpPXPpoqdNk4QzmpP',
  '5HDzyY8kFQYLk1mMWqyfd95RPubHtLKoaoP5Ey4dk6qgvDQb',
  '5Hijh2ELSdoXaCrSoEk15yS69TtP4axuPxUJEetnjCr2pz2c',
  '5CaAEwV3xxWgehfBZjwqaouKZtEL9XAZFbDLqijwirGfwApD',
  '5G3e3oYhbE3LJHKgRKgCcXRVGK8bb7cgZcti8uSLcrNHo94B',
  '5HBbfLsnxD7zv1DNKeYZuysJabW5PnBPbtjXwjPxtvYY72Xu',
  '5DybyW6fdNpcfxu9gJ2Gs776hP1KmdcX3JbHF2HqHu7eHfFH',
];

const chainIds = ['0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'];

export class MockDataBuilder {
  private accountIdCounter = 1;
  private walletIdCounter = 1;

  buildAccount(
    isActive: boolean,
    isMain: boolean,
    signingType: string,
    walletId?: number,
    derivationPath?: string,
    rootId?: number,
    chainAccount?: boolean,
  ) {
    const account = {
      id: this.accountIdCounter++,
      name: `Account ${this.accountIdCounter}`,
      accountId: accountIds[this.accountIdCounter],
      cryptoType: 0,
      chainType: 0,
      walletId: walletId,
      isActive: isActive,
      isMain: isMain,
      signingType: signingType,
      derivationPath: derivationPath,
      rootId: rootId,
      chainId: chainAccount ? chainIds[0] : undefined,
    };

    return account;
  }

  generateSignatories(num: number): Array<any> {
    const signatories: any[] = [];
    for (let i = 0; i < num; i++) {
      signatories.push({
        index: i.toString(),
        name: `signatory_${i}`,
        address: addresses[i],
        accountId: accountIds[i],
      });
    }

    return signatories;
  }

  buildMultisigAccount(threshold: number, signatoryNumber: number) {
    const baseAccount = this.buildAccount(false, false, 'signing_ms');
    baseAccount['creatorAccountId'] = accountIds[0];
    baseAccount['threshold'] = threshold;
    baseAccount['signatories'] = this.generateSignatories(signatoryNumber);

    return baseAccount;
  }

  buildWallet(walletType: string) {
    return {
      id: this.walletIdCounter++,
      name: `Wallet ${this.walletIdCounter}`,
      type: walletType,
    };
  }

  buildMultishardWallet() {
    const wallet = this.buildWallet('wallet_mps');
    const root = this.buildAccount(false, false, 'signing_ps', wallet.id);
    const shard = this.buildAccount(true, false, 'signing_ps', wallet.id, undefined, root.id, true);

    return { wallet, root, shard };
  }

  buildMultisigWallet(threshold: number, signatories: number) {
    const signatoryAccount = this.buildAccount(false, false, 'signing_ps');
    const multisigAccount = this.buildMultisigAccount(threshold, signatories);

    return { signatoryAccount, multisigAccount };
  }
}
