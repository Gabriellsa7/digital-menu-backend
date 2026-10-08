import { Store } from '../../domain/store/store.entity';
import { Mstore } from '../../infrastructure/db/mongo/models/store.model';
import { StoreRepositoryRead } from '../../infrastructure/repository/store/store.repository.read';
import { StoreRepositoryWrite } from '../../infrastructure/repository/store/store.repository.write';

const storeRepositoryRead = new StoreRepositoryRead();
const storeRepositoryWrite = new StoreRepositoryWrite();

function aStore(id: string, slug: string) {
  return Store.withDefaults(id, new Date(), { name: 'Burger House', slug });
}

beforeEach(async () => {
  await Mstore.deleteMany({});
  await Mstore.syncIndexes();
});

describe('When we persist stores', () => {
  it('should keep many stores and find each one by id or slug', async () => {
    await storeRepositoryWrite.createStore(aStore('store-a', 'casa-brasa'));
    await storeRepositoryWrite.createStore(aStore('store-b', 'pizza-boa'));

    await expect(
      storeRepositoryRead.findStoreBySlug('pizza-boa'),
    ).resolves.toMatchObject({ id: 'store-b' });
    await expect(
      storeRepositoryRead.findStoreById('store-a'),
    ).resolves.toMatchObject({ slug: 'casa-brasa' });
    await expect(storeRepositoryRead.findFirstStore()).resolves.toMatchObject({
      id: 'store-a',
    });
  });

  it('should reject a duplicated slug (TEN-R01)', async () => {
    await storeRepositoryWrite.createStore(aStore('store-a', 'casa-brasa'));

    await expect(
      storeRepositoryWrite.createStore(aStore('store-b', 'casa-brasa')),
    ).rejects.toThrow(/duplicate key/);
  });

  it('should list only active stores', async () => {
    await storeRepositoryWrite.createStore(aStore('store-a', 'casa-brasa'));
    await storeRepositoryWrite.createStore({
      ...aStore('store-b', 'pizza-boa'),
      isActive: false,
    });

    const stores = await storeRepositoryRead.listActiveStores();

    expect(stores.map(({ id }) => id)).toEqual(['store-a']);
  });

  it('should set and unset fields of one store without leaking mongo internals', async () => {
    await storeRepositoryWrite.createStore(aStore('store-a', 'casa-brasa'));
    await storeRepositoryWrite.createStore(aStore('store-b', 'pizza-boa'));
    await storeRepositoryWrite.updateStore('store-a', {
      set: { name: 'Casa Brasa', manualStatusUntil: new Date() },
    });

    const updated = await storeRepositoryWrite.updateStore('store-a', {
      unset: ['manualStatusUntil'],
    });
    const other = await storeRepositoryRead.findStoreById('store-b');

    expect(updated).toMatchObject({ id: 'store-a', name: 'Casa Brasa' });
    expect(updated).not.toHaveProperty('manualStatusUntil');
    expect(updated).not.toHaveProperty('_id');
    expect(other?.name).toBe('Burger House');
  });
});
