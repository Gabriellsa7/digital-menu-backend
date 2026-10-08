import { IBestSellersReader } from '../../domain/menu/interfaces/best-sellers.reader.interface';
import { CachedBestSellersReader } from '../../infrastructure/cache/cached-best-sellers.reader';
import { FixedClock } from '../helpers/fixed.clock';

const NOW = '2026-10-15T12:00:00.000Z';

describe('When the best sellers are cached (HOM-R03)', () => {
  it('should reuse the result for 15 minutes per store', async () => {
    const clock = new FixedClock(NOW);
    const reader: jest.Mocked<IBestSellersReader> = {
      listBestSellers: jest.fn().mockResolvedValue([]),
    };
    const cached = new CachedBestSellersReader(reader, clock);

    await cached.listBestSellers('store-1', new Date(), 10);
    await cached.listBestSellers('store-1', new Date(), 10);
    await cached.listBestSellers('store-2', new Date(), 10);
    clock.advanceSeconds(15 * 60);
    await cached.listBestSellers('store-1', new Date(), 10);

    expect(reader.listBestSellers).toHaveBeenCalledTimes(3);
  });
});
