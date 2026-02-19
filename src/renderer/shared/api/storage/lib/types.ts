import { type Table } from 'dexie';

import {
  type Balance,
  type ChainMetadata,
  type Connection,
  type Contact,
  type Notification,
  type ProxyAccount,
  type Serializable,
  type Wallet,
} from '@/shared/core';
// TODO don't know what to do here, looks like it's impossible to decouple storage service because of version migration code.
/* eslint-disable boundaries/entry-point, boundaries/element-types */
import { type AnyAccount } from '@/domains/network/account/types';
import { type BasketTransaction } from '@/aggregates/basket-operations';
/* eslint-enable boundaries/entry-point, boundaries/element-types */

// =====================================================
// ================== Storage Schemes ==================
// =====================================================

export type ID = string;
export type AnyAccountDS = AnyAccount & { id: string };

export type TWallet = Table<Omit<Wallet, 'accounts'>, Wallet['id']>;
export type TContact = Table<Contact, Contact['id']>;
export type TAccount = Table<AnyAccount, AnyAccount['id']>;
export type TAccount2 = Table<AnyAccountDS, AnyAccountDS['id']>;
export type TBalance = Table<Serializable<Balance>, Balance['id']>;
export type TConnection = Table<Connection, Connection['id']>;
export type TProxy = Table<ProxyAccount, ProxyAccount['id']>;
export type TNotification = Table<Notification, Notification['id']>;
export type TMetadata = Table<ChainMetadata, ChainMetadata['id']>;
export type TBasketTransaction = Table<BasketTransaction, BasketTransaction['id']>;
