import { TTransactionContext } from './transaction.interface';

export interface ICounterRepository {
  nextValue(key: string, context?: TTransactionContext): Promise<number>;
}
