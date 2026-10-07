export type TTransactionContext = unknown;

export interface ITransactionRunner {
  runInTransaction<T>(
    work: (context: TTransactionContext) => Promise<T>,
  ): Promise<T>;
}
