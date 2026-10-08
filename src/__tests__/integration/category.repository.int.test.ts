import { randomUUID } from 'crypto';
import { Mcategory } from '../../infrastructure/db/mongo/models/category.model';
import { CategoryRepositoryRead } from '../../infrastructure/repository/category/category.repository.read';
import { CategoryRepositoryWrite } from '../../infrastructure/repository/category/category.repository.write';

const categoryRepositoryRead = new CategoryRepositoryRead();
const categoryRepositoryWrite = new CategoryRepositoryWrite();

function createCategory(name: string, position: number) {
  const now = new Date();
  return categoryRepositoryWrite.createCategory({
    id: randomUUID(),
    name,
    position,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
}

beforeEach(async () => {
  await Mcategory.deleteMany({});
  await Mcategory.syncIndexes();
});

describe('When we persist categories', () => {
  it('should find a category by name ignoring casing and accents', async () => {
    await createCategory('Sobremesas', 0);

    const found = await categoryRepositoryRead.findCategoryByName('SOBREMESAS');

    expect(found?.name).toBe('Sobremesas');
  });

  it('should reject a duplicated name with other casing (CAT-R01)', async () => {
    await createCategory('Bebidas', 0);

    await expect(createCategory('BEBIDAS', 1)).rejects.toThrow(/duplicate key/);
  });

  it('should rewrite positions 0..n on reorder (CAT-R03)', async () => {
    const first = await createCategory('Burgers', 0);
    const second = await createCategory('Bebidas', 5);
    await expect(categoryRepositoryRead.findMaxCategoryPosition()).resolves.toBe(
      5,
    );

    await categoryRepositoryWrite.reorderCategories([second.id, first.id]);

    const listed = await categoryRepositoryRead.listCategories();
    expect(listed.map(({ name, position }) => ({ name, position }))).toEqual([
      { name: 'Bebidas', position: 0 },
      { name: 'Burgers', position: 1 },
    ]);
  });
});
