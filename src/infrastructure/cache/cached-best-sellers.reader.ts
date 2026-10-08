import { IClock } from '../../domain/common/clock.interface';
import {
  IBestSeller,
  IBestSellersReader,
} from '../../domain/menu/interfaces/best-sellers.reader.interface';

const CACHE_TTL_MILLISECONDS = 15 * 60 * 1000;

interface ICacheEntry {
  bestSellers: IBestSeller[];
  expiresAt: number;
}

export class CachedBestSellersReader implements IBestSellersReader {
  private readonly entries = new Map<string, ICacheEntry>();

  constructor(
    private readonly reader: IBestSellersReader,
    private readonly clock: IClock,
  ) {}

  async listBestSellers(
    storeId: string,
    since: Date,
    limit: number,
  ): Promise<IBestSeller[]> {
    const now = this.clock.now().getTime();
    const cached = this.entries.get(storeId);
    if (cached && cached.expiresAt > now) {
      return cached.bestSellers;
    }
    const bestSellers = await this.reader.listBestSellers(
      storeId,
      since,
      limit,
    );
    this.entries.set(storeId, {
      bestSellers,
      expiresAt: now + CACHE_TTL_MILLISECONDS,
    });
    return bestSellers;
  }
}
