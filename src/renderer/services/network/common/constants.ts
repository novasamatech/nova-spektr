import { BN, BN_THOUSAND, BN_TWO } from '@polkadot/util';

export const enum Chains {
  POLKADOT = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  KUSAMA = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
  STATEMINE = '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
  STATEMINT = '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f',
  KARURA = '0xbaf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b',
  ACALA = '0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
}

export const enum TestChains {
  ROCOCO = '0x6408de7737c59c238890533af25896a2c20608d8b380bb01029acb392781063e',
  WESTEND = '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
  WESTMINT = '0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9',
}

export const AUTO_BALANCE_TIMEOUT = 1000;
export const MAX_ATTEMPTS = 3;
export const PROGRESSION_BASE = 2;

// Some chains incorrectly use these, i.e. it is set to values such as 0 or even 2
// Use a low minimum validity threshold to check these against
export const THRESHOLD = BN_THOUSAND.div(BN_TWO);
export const DEFAULT_TIME = new BN(6_000);
export const ONE_DAY = new BN(24 * 60 * 60 * 1000);
