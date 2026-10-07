import { BusinessRuleError } from '../errors/business-rule.error';
import { IImageFile } from './storage.provider.interface';

export const MAX_IMAGE_SIZE_IN_BYTES = 3 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export function assertValidImage(file?: IImageFile): asserts file {
  if (!file) {
    throw new BusinessRuleError('An image file is required', 'IMAGE_REQUIRED');
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimeType)) {
    throw new BusinessRuleError(
      'Images must be JPEG, PNG or WebP',
      'INVALID_IMAGE_TYPE',
      { allowedTypes: ALLOWED_IMAGE_MIME_TYPES },
    );
  }
  if (file.size > MAX_IMAGE_SIZE_IN_BYTES) {
    throw new BusinessRuleError(
      'Images must be at most 3 MB',
      'IMAGE_TOO_LARGE',
      { maxSizeInBytes: MAX_IMAGE_SIZE_IN_BYTES },
    );
  }
}
