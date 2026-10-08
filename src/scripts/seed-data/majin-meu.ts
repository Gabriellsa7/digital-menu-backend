import { ECouponType } from '../../domain/coupon/interfaces/coupon.interface';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { EWeekday } from '../../domain/store/interfaces/store.interface';
import { ICategorySeed, IOptionGroupSeed } from './catalog';

const ONE_YEAR_IN_MILLISECONDS = 365 * 24 * 60 * 60 * 1000;

export const MAJIN_MEU_STORE_SEED = {
  name: 'Majin Meu',
  slug: 'majin-meu',
  description: 'Lámen, gyoza e donburi feitos na hora no coração da Liberdade.',
  phone: '+5511977770000',
  address: {
    zipCode: '01503001',
    street: 'Rua Galvão Bueno',
    number: '470',
    complement: 'Loja 2',
    neighborhood: 'Liberdade',
    city: 'São Paulo',
    state: 'SP',
    reference: 'Ao lado da Praça da Liberdade',
  },
  minimumOrderInCents: 3000,
  deliveryEnabled: true,
  pickupEnabled: true,
  pickupEtaMinutes: 25,
};

export const MAJIN_MEU_IMAGES_SEED = {
  logoUrl: 'https://picsum.photos/seed/majin-meu-logo/256/256',
  bannerUrl: 'https://picsum.photos/seed/majin-meu-banner/1200/400',
};

export const MAJIN_MEU_OPENING_HOURS_SEED = [
  EWeekday.MONDAY,
  EWeekday.TUESDAY,
  EWeekday.WEDNESDAY,
  EWeekday.THURSDAY,
  EWeekday.FRIDAY,
  EWeekday.SATURDAY,
  EWeekday.SUNDAY,
].flatMap((weekday) => [
  { weekday, opensAt: '11:30', closesAt: '15:00' },
  { weekday, opensAt: '18:00', closesAt: '23:59' },
]);

export const MAJIN_MEU_OPTION_GROUPS_SEED: IOptionGroupSeed[] = [
  {
    key: 'broth',
    name: 'Caldo',
    minSelections: 1,
    maxSelections: 1,
    allowRepeat: false,
    options: [
      ['Shoyu', 0],
      ['Missô', 0],
      ['Tonkotsu', 400],
    ],
  },
  {
    key: 'toppings',
    name: 'Adicionais',
    minSelections: 0,
    maxSelections: 4,
    allowRepeat: true,
    options: [
      ['Ovo marinado', 400],
      ['Chashu extra', 900],
      ['Nori', 200],
      ['Milho', 200],
    ],
  },
];

export const MAJIN_MEU_CATALOG_SEED: ICategorySeed[] = [
  {
    name: 'Lámen',
    products: [
      {
        name: 'Lámen tradicional',
        description: 'Macarrão artesanal, chashu, ovo marinado e cebolinha.',
        priceInCents: 4290,
        groups: ['broth', 'toppings'],
      },
      {
        name: 'Lámen picante',
        description:
          'Caldo apimentado com carne moída, broto de feijão e nori.',
        priceInCents: 4590,
        groups: ['broth', 'toppings'],
      },
      {
        name: 'Lámen vegano',
        description: 'Caldo de cogumelos, tofu, milho e acelga.',
        priceInCents: 3990,
        groups: ['toppings'],
      },
    ],
  },
  {
    name: 'Entradas',
    products: [
      {
        name: 'Gyoza',
        description: 'Seis unidades de pastel japonês de porco grelhado.',
        priceInCents: 2490,
        servesPeople: 2,
      },
      {
        name: 'Edamame',
        description: 'Vagem de soja na flor de sal.',
        priceInCents: 1890,
        servesPeople: 2,
      },
      {
        name: 'Karaage',
        description: 'Frango frito japonês com maionese de limão.',
        priceInCents: 2990,
        servesPeople: 2,
        isAvailable: false,
      },
    ],
  },
  {
    name: 'Donburi',
    products: [
      {
        name: 'Gyudon',
        description: 'Arroz com fatias de carne e cebola ao molho tarê.',
        priceInCents: 3790,
      },
      {
        name: 'Katsudon',
        description: 'Arroz com tonkatsu, ovo e cebola.',
        priceInCents: 3990,
      },
    ],
  },
  {
    name: 'Bebidas',
    products: [
      {
        name: 'Chá verde gelado',
        description: 'Garrafa de 500 ml.',
        priceInCents: 990,
      },
      {
        name: 'Ramune',
        description: 'Refrigerante japonês sabor original.',
        priceInCents: 1490,
      },
    ],
  },
];

export const MAJIN_MEU_ZONES_SEED: [string, number, number, number][] = [
  ['Liberdade', 490, 20, 35],
  ['Aclimação', 690, 30, 45],
  ['Bela Vista', 690, 30, 45],
  ['Vila Mariana', 890, 35, 55],
];

export function majinMeuCouponsSeed(now: Date) {
  return [
    {
      code: 'MAJIN15',
      type: ECouponType.PERCENTAGE,
      value: 15,
      maxDiscountInCents: 2000,
      minOrderInCents: 5000,
      startsAt: now,
      expiresAt: new Date(now.getTime() + ONE_YEAR_IN_MILLISECONDS),
      usagePerCustomer: 1,
      firstOrderOnly: false,
      isActive: true,
      isPublic: true,
    },
  ];
}

export const MAJIN_MEU_STAFF_USERS_SEED = [
  {
    name: 'Kenji Majin',
    email: 'owner.majin@digitalmenu.dev',
    password: 'owner12345',
    role: EStaffRole.OWNER,
  },
];
