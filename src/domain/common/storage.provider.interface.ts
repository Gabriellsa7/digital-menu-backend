export interface IImageFile {
  buffer: Buffer;
  mimeType: string;
  size: number;
}

export interface IParamsUploadImage {
  file: IImageFile;
  folder: string;
}

export interface IUploadedImage {
  url: string;
  publicId: string;
}

export interface IStorageProvider {
  uploadImage(params: IParamsUploadImage): Promise<IUploadedImage>;
  deleteImage(publicId: string): Promise<void>;
}
