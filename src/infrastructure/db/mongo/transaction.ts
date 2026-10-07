import mongoose, { ClientSession } from 'mongoose';
import {
  ITransactionRunner,
  TTransactionContext,
} from '../../../domain/common/transaction.interface';

export function toSession(
  context?: TTransactionContext,
): ClientSession | undefined {
  return context as ClientSession | undefined;
}

export class MongoTransactionRunner implements ITransactionRunner {
  async runInTransaction<T>(
    work: (context: TTransactionContext) => Promise<T>,
  ): Promise<T> {
    const session = await mongoose.startSession();
    try {
      let result: T | undefined;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result as T;
    } finally {
      await session.endSession();
    }
  }
}
