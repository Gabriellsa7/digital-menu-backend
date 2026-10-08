import { DeliveryZoneService } from '../../domain/delivery-zone/service/delivery-zone.service';
import { IDeliveryZoneRepositoryRead } from '../../domain/delivery-zone/repository/delivery-zone.repository.read';
import { IDeliveryZoneRepositoryWrite } from '../../domain/delivery-zone/repository/delivery-zone.repository.write';
import { IDeliveryZone } from '../../domain/delivery-zone/interfaces/delivery-zone.interface';
import { ConflictError } from '../../domain/errors/conflict.error';
import { NotFoundError } from '../../domain/errors/not-found.error';
import { FixedClock } from '../helpers/fixed.clock';

const clock = new FixedClock();
const ZONE_DATA = {
  displayName: 'Vila Mariana',
  city: 'São Paulo',
  feeInCents: 590,
  etaMinMinutes: 30,
  etaMaxMinutes: 45,
  isActive: true,
};

function aZone(overrides: Partial<IDeliveryZone> = {}): IDeliveryZone {
  return {
    ...ZONE_DATA,
    id: 'zone-1',
    neighborhood: 'vila mariana',
    cityKey: 'sao paulo',
    createdAt: clock.now(),
    updatedAt: clock.now(),
    ...overrides,
  };
}

let deliveryZoneRepositoryRead: jest.Mocked<IDeliveryZoneRepositoryRead>;
let deliveryZoneRepositoryWrite: jest.Mocked<IDeliveryZoneRepositoryWrite>;
let deliveryZoneService: DeliveryZoneService;

beforeEach(() => {
  deliveryZoneRepositoryRead = {
    findDeliveryZoneById: jest.fn(),
    findDeliveryZoneByKeys: jest.fn().mockResolvedValue(null),
    listDeliveryZones: jest.fn().mockResolvedValue([]),
  };
  deliveryZoneRepositoryWrite = {
    createDeliveryZone: jest.fn(async (zone) => ({ ...zone })),
    updateDeliveryZoneById: jest.fn(async (id, fields) => ({
      ...aZone({ id }),
      ...fields,
    })),
    deleteDeliveryZoneById: jest.fn().mockResolvedValue(true),
  };
  deliveryZoneService = new DeliveryZoneService({
    deliveryZoneRepositoryRead,
    deliveryZoneRepositoryWrite,
    clock,
  });
});

describe('When the owner creates a delivery zone', () => {
  it('should store the normalized neighborhood and city keys', async () => {
    const zone = await deliveryZoneService.createDeliveryZone({
      ...ZONE_DATA,
      displayName: ' Vila Mariána ',
    });

    expect(zone).toMatchObject({
      displayName: 'Vila Mariána',
      neighborhood: 'vila mariana',
      cityKey: 'sao paulo',
    });
  });

  it('should reject a duplicated neighborhood in the same city (DLZ-R01)', async () => {
    deliveryZoneRepositoryRead.findDeliveryZoneByKeys.mockResolvedValue(
      aZone({ id: 'other' }),
    );

    await expect(
      deliveryZoneService.createDeliveryZone(ZONE_DATA),
    ).rejects.toThrow(ConflictError);
  });

  it('should reject a minimum ETA above the maximum (DLZ-R02)', async () => {
    await expect(
      deliveryZoneService.createDeliveryZone({
        ...ZONE_DATA,
        etaMinMinutes: 60,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_ETA' });
  });

  it('should reject a negative fee and accept a free zone (DLZ-R03)', async () => {
    await expect(
      deliveryZoneService.createDeliveryZone({ ...ZONE_DATA, feeInCents: -1 }),
    ).rejects.toMatchObject({ code: 'INVALID_FEE' });
    await expect(
      deliveryZoneService.createDeliveryZone({ ...ZONE_DATA, feeInCents: 0 }),
    ).resolves.toMatchObject({ feeInCents: 0 });
  });
});

describe('When the owner updates a delivery zone', () => {
  it('should merge the changes and keep the rules', async () => {
    deliveryZoneRepositoryRead.findDeliveryZoneById.mockResolvedValue(aZone());

    await expect(
      deliveryZoneService.updateDeliveryZone({
        id: 'zone-1',
        etaMaxMinutes: 20,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_ETA' });
  });

  it('should allow saving the same neighborhood of the zone itself', async () => {
    deliveryZoneRepositoryRead.findDeliveryZoneById.mockResolvedValue(aZone());
    deliveryZoneRepositoryRead.findDeliveryZoneByKeys.mockResolvedValue(
      aZone(),
    );

    const zone = await deliveryZoneService.updateDeliveryZone({
      id: 'zone-1',
      feeInCents: 790,
    });

    expect(zone.feeInCents).toBe(790);
  });

  it('should throw NotFoundError for an unknown zone', async () => {
    deliveryZoneRepositoryRead.findDeliveryZoneById.mockResolvedValue(null);

    await expect(
      deliveryZoneService.updateDeliveryZone({ id: 'missing', feeInCents: 1 }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('When we delete a delivery zone', () => {
  it('should throw NotFoundError when nothing was deleted', async () => {
    deliveryZoneRepositoryWrite.deleteDeliveryZoneById.mockResolvedValue(false);

    await expect(
      deliveryZoneService.deleteDeliveryZone('missing'),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('When we resolve an address to a delivery zone (CUS-R03)', () => {
  it('should match accents and casing differences', async () => {
    deliveryZoneRepositoryRead.findDeliveryZoneByKeys.mockResolvedValue(
      aZone(),
    );

    await expect(
      deliveryZoneService.resolveDeliveryZoneId('vila mariána', 'SAO PAULO'),
    ).resolves.toBe('zone-1');
    expect(
      deliveryZoneRepositoryRead.findDeliveryZoneByKeys,
    ).toHaveBeenCalledWith('vila mariana', 'sao paulo');
  });

  it('should ignore inactive zones', async () => {
    deliveryZoneRepositoryRead.findDeliveryZoneByKeys.mockResolvedValue(
      aZone({ isActive: false }),
    );

    await expect(
      deliveryZoneService.resolveDeliveryZoneId('Vila Mariana', 'São Paulo'),
    ).resolves.toBeUndefined();
    await expect(
      deliveryZoneService.resolveDeliveryZone('Vila Mariana', 'São Paulo'),
    ).rejects.toThrow(NotFoundError);
  });

  it('should list only active zones for the public', async () => {
    await deliveryZoneService.listDeliveryZones(true);

    expect(deliveryZoneRepositoryRead.listDeliveryZones).toHaveBeenCalledWith({
      isActive: true,
    });
  });
});
