import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { as } from '../helpers/http.helper';
import {
  clearCatalog,
  createCategory,
  createProduct,
} from '../helpers/catalog.helper';
import { loginAs } from '../helpers/staff-session.helper';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

let staffToken: string;
let productId: string;

beforeEach(async () => {
  await clearCatalog();
  ({ accessToken: staffToken } = await loginAs());
  const category = await createCategory();
  ({ id: productId } = await createProduct(category.id));
});

function uploadProductImage(
  file: Buffer,
  options: { filename: string; contentType: string },
) {
  return as(staffToken)
    .post(`/admin/products/${productId}/image`)
    .attach('image', file, options);
}

describe('When staff uploads a product image', () => {
  it('should replace the image and keep a new URL (PRD-R03)', async () => {
    const first = await uploadProductImage(PNG, {
      filename: 'a.png',
      contentType: 'image/png',
    });
    const second = await uploadProductImage(PNG, {
      filename: 'b.png',
      contentType: 'image/png',
    });

    expect(first.statusCode).toBe(200);
    expect(first.body.imageUrl).toEqual(expect.any(String));
    expect(second.body.imageUrl).not.toBe(first.body.imageUrl);
  });

  it('should answer 422 for a GIF (PRD-R04)', async () => {
    const { body, statusCode } = await uploadProductImage(PNG, {
      filename: 'a.gif',
      contentType: 'image/gif',
    });

    expect(statusCode).toBe(422);
    expect(body.code).toBe('INVALID_IMAGE_TYPE');
  });

  it('should answer 422 for a file above 3 MB (PRD-R04)', async () => {
    const { body, statusCode } = await uploadProductImage(
      Buffer.alloc(3 * 1024 * 1024 + 1),
      { filename: 'big.png', contentType: 'image/png' },
    );

    expect(statusCode).toBe(422);
    expect(body.code).toBe('IMAGE_TOO_LARGE');
  });

  it('should answer 422 without a file', async () => {
    const { body, statusCode } = await as(staffToken)
      .post(`/admin/products/${productId}/image`)
      .field('other', 'value');

    expect(statusCode).toBe(422);
    expect(body.code).toBe('IMAGE_REQUIRED');
  });

  it('should remove the image', async () => {
    await uploadProductImage(PNG, {
      filename: 'a.png',
      contentType: 'image/png',
    });

    const { body } = await as(staffToken).delete(
      `/admin/products/${productId}/image`,
    );

    expect(body).not.toHaveProperty('imageUrl');
  });
});

describe('When the owner uploads the store logo', () => {
  it('should save the logo URL', async () => {
    const { accessToken } = await loginAs(EStaffRole.OWNER);

    const { body, statusCode } = await as(accessToken)
      .post('/admin/store/images/logo')
      .attach('image', PNG, { filename: 'logo.png', contentType: 'image/png' });

    expect(statusCode).toBe(200);
    expect(body.logoUrl).toEqual(expect.any(String));
  });
});
