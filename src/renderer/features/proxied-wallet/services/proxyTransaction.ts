import { type AnyDecodedTransaction } from '@/domains/network';
import { type ProxyTransaction } from '../types';

function isProxyTransaction(transaction: AnyDecodedTransaction): transaction is ProxyTransaction {
  return transaction.section === 'proxy' && transaction.method === 'proxy';
}

export const proxyService = {
  isProxyTransaction,
};
