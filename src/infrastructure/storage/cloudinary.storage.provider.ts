import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import {
  IParamsUploadImage,
  IStorageProvider,
  IUploadedImage,
} from '../../domain/common/storage.provider.interface';

export interface IParamsCloudinaryStorageProvider {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export class CloudinaryStorageProvider implements IStorageProvider {
  constructor({ cloudName, apiKey, apiSecret }: IParamsCloudinaryStorageProvider) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  uploadImage({ file, folder }: IParamsUploadImage): Promise<IUploadedImage> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload failed'));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(file.buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  }
}
