import { Logger } from 'traceability';
import { IStorageProvider } from '../../../domain/common/storage.provider.interface';
import { CloudinaryStorageProvider } from '../../storage/cloudinary.storage.provider';
import { InMemoryStorageProvider } from '../../storage/in-memory.storage.provider';
import { env } from '../env';

let storageProvider: IStorageProvider | undefined;

export class StorageProviderFactory {
  static create(): IStorageProvider {
    storageProvider ??= StorageProviderFactory.build();
    return storageProvider;
  }

  private static build(): IStorageProvider {
    const { cloudName, apiKey, apiSecret } = env.cloudinary;
    if (cloudName && apiKey && apiSecret) {
      return new CloudinaryStorageProvider({ cloudName, apiKey, apiSecret });
    }
    if (env.isProduction) {
      throw new Error('CLOUDINARY_* variables are required in production');
    }
    Logger.warn('Cloudinary is not configured, images are kept in memory', {
      eventName: 'storage.in_memory',
    });
    return new InMemoryStorageProvider();
  }
}
