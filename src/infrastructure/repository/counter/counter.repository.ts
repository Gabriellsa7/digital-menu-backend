import { ICounterRepository } from '../../../domain/common/counter.repository';
import { TTransactionContext } from '../../../domain/common/transaction.interface';
import { Mcounter } from '../../db/mongo/models/counter.model';
import { IMCounter } from '../../db/mongo/schema/counter.schema';
import { toSession } from '../../db/mongo/transaction';

export class CounterRepository implements ICounterRepository {
  async nextValue(key: string, context?: TTransactionContext): Promise<number> {
    const counter = await Mcounter.findOneAndUpdate(
      { key },
      { $inc: { value: 1 } },
      { upsert: true, new: true, session: toSession(context) },
    ).lean<IMCounter>();
    return counter!.value;
  }
}
