import { ECouponType } from '../../domain/coupon/interfaces/coupon.interface';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { EWeekday } from '../../domain/store/interfaces/store.interface';
import { ICategorySeed, IOptionGroupSeed } from './catalog';

const ONE_YEAR_IN_MILLISECONDS = 365 * 24 * 60 * 60 * 1000;

export const PIZZERIA_STORE_SEED = {
  name: 'Forno da Vila',
  slug: 'forno-da-vila',
  description: 'Pizzas de fermentação natural assadas no forno a lenha.',
  phone: '+5511988880000',
  address: {
    zipCode: '04014000',
    street: 'Rua Domingos de Morais',
    number: '800',
    neighborhood: 'Vila Mariana',
    city: 'São Paulo',
    state: 'SP',
  },
  minimumOrderInCents: 4000,
  deliveryEnabled: true,
  pickupEnabled: true,
  pickupEtaMinutes: 30,
};

export const PIZZERIA_OPENING_HOURS_SEED = [
  EWeekday.TUESDAY,
  EWeekday.WEDNESDAY,
  EWeekday.THURSDAY,
  EWeekday.FRIDAY,
  EWeekday.SATURDAY,
  EWeekday.SUNDAY,
].map((weekday) => ({ weekday, opensAt: '18:00', closesAt: '23:30' }));

export const PIZZERIA_OPTION_GROUPS_SEED: IOptionGroupSeed[] = [
  {
    key: 'crust',
    name: 'Borda',
    minSelections: 0,
    maxSelections: 1,
    allowRepeat: false,
    options: [
      ['Catupiry', 900],
      ['Cheddar', 900],
      ['Chocolate', 1100],
    ],
  },
];

export const PIZZERIA_CATALOG_SEED: ICategorySeed[] = [
  {
    name: 'Pizzas salgadas',
    products: [
      {
        name: 'Margherita',
        description: 'Molho de tomate, muçarela de búfala e manjericão.',
        priceInCents: 5490,
        groups: ['crust'],
        servesPeople: 2,
      },
      {
        name: 'Calabresa',
        description: 'Calabresa artesanal, cebola roxa e azeitonas.',
        priceInCents: 5290,
        groups: ['crust'],
        servesPeople: 2,
      },
      {
        name: 'Quatro queijos',
        description: 'Muçarela, gorgonzola, parmesão e catupiry.',
        priceInCents: 5990,
        groups: ['crust'],
        servesPeople: 2,
      },
    ],
  },
  {
    name: 'Pizzas doces',
    products: [
      {
        name: 'Banana com canela',
        description: 'Banana, açúcar mascavo e canela.',
        priceInCents: 4290,
        servesPeople: 2,
      },
    ],
  },
  {
    name: 'Bebidas',
    products: [
      {
        name: 'Refrigerante 2 L',
        description: 'Coca-Cola ou Guaraná.',
        priceInCents: 1400,
      },
      {
        name: 'Vinho tinto da casa',
        description: 'Taça de 150 ml.',
        priceInCents: 1900,
      },
    ],
  },
];

export const PIZZERIA_ZONES_SEED: [string, number, number, number][] = [
  ['Vila Mariana', 790, 40, 55],
  ['Paraíso', 890, 40, 60],
  ['Moema', 990, 45, 60],
];

export function pizzeriaCouponsSeed(now: Date) {
  return [
    {
      code: 'PIZZA20',
      type: ECouponType.PERCENTAGE,
      value: 20,
      maxDiscountInCents: 2500,
      minOrderInCents: 8000,
      startsAt: now,
      expiresAt: new Date(now.getTime() + ONE_YEAR_IN_MILLISECONDS),
      usagePerCustomer: 1,
      firstOrderOnly: false,
      isActive: true,
      isPublic: true,
    },
  ];
}

export const PIZZERIA_STAFF_USERS_SEED = [
  {
    name: 'Carla Pizzaiola',
    email: 'owner.pizza@digitalmenu.dev',
    password: 'owner12345',
    role: EStaffRole.OWNER,
  },
];

export const DRAFT_STORE_SEED = {
  name: 'Açaí do Bairro',
  slug: 'acai-do-bairro',
  description: 'Loja em montagem: aparece só no painel.',
};

export const DRAFT_STAFF_USERS_SEED = [
  {
    name: 'Diego Açaí',
    email: 'owner.acai@digitalmenu.dev',
    password: 'owner12345',
    role: EStaffRole.OWNER,
  },
];
