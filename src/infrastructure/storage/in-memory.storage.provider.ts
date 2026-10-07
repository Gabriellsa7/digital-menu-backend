import { randomUUID } from 'crypto';
import {
  IParamsUploadImage,
  IStorageProvider,
  IUploadedImage,
} from '../../domain/common/storage.provider.interface';

export class InMemoryStorageProvider implements IStorageProvider {
  public readonly images = new Map<string, IParamsUploadImage>();

  async uploadImage(params: IParamsUploadImage): Promise<IUploadedImage> {
    const publicId = `${params.folder}/${randomUUID()}`;
    this.images.set(publicId, params);
    return { url: `https://images.local/${publicId}`, publicId };
  }

  async deleteImage(publicId: string): Promise<void> {
    this.images.delete(publicId);
  }
}
