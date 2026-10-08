import { Store } from '../../domain/store/store.entity';
import { Mstore } from '../../infrastructure/db/mongo/models/store.model';
import { StoreRepositoryRead } from '../../infrastructure/repository/store/store.repository.read';
import { StoreRepositoryWrite } from '../../infrastructure/repository/store/store.repository.write';

const storeRepositoryRead = new StoreRepositoryRead();
const storeRepositoryWrite = new StoreRepositoryWrite();

beforeEach(async () => {
  await Mstore.deleteMany({});
  await Mstore.syncIndexes();
});

describe('When we persist the singleton store (STO-R01)', () => {
  it('should keep a single document when created concurrently', async () => {
    await Promise.all(
      ['a', 'b', 'c'].map((id) =>
        storeRepositoryWrite.createStoreIfMissing(
          Store.withDefaults(id, new Date()),
        ),
      ),
    );

    await expect(Mstore.countDocuments()).resolves.toBe(1);
  });

  it('should set and unset fields without leaking mongo internals', async () => {
    await storeRepositoryWrite.createStoreIfMissing(
      Store.withDefaults('store-1', new Date()),
    );
    await storeRepositoryWrite.updateStore({
      set: { name: 'Burger House', manualStatusUntil: new Date() },
    });

    const updated = await storeRepositoryWrite.updateStore({
      unset: ['manualStatusUntil'],
    });
    const found = await storeRepositoryRead.findStore();

    expect(updated).toMatchObject({ id: 'store-1', name: 'Burger House' });
    expect(updated).not.toHaveProperty('manualStatusUntil');
    expect(found).not.toHaveProperty('_id');
  });
});
