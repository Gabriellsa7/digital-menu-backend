import { Request, RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { IImageFile } from '../../../domain/common/storage.provider.interface';
import { MAX_IMAGE_SIZE_IN_BYTES } from '../../../domain/common/image';
import { BusinessRuleError } from '../../../domain/errors/business-rule.error';

const IMAGE_FIELD = 'image';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_IN_BYTES, files: 1 },
}).single(IMAGE_FIELD);

export const imageUpload: RequestHandler = (req, res, next) => {
  upload(req, res, (error: unknown) => {
    if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(
        new BusinessRuleError('Images must be at most 3 MB', 'IMAGE_TOO_LARGE', {
          maxSizeInBytes: MAX_IMAGE_SIZE_IN_BYTES,
        }),
      );
      return;
    }
    if (error instanceof MulterError) {
      next(new BusinessRuleError(error.message, 'INVALID_IMAGE_UPLOAD'));
      return;
    }
    next(error);
  });
};

export function uploadedImage(req: Request): IImageFile | undefined {
  return req.file
    ? {
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        size: req.file.size,
      }
    : undefined;
}
