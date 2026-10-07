import { EWeekday } from '../../domain/store/interfaces/store.interface';

export const STORE_SEED = {
  name: 'Smash Bros Burger',
  slug: 'smash-bros-burger',
  description:
    'Smash burgers feitos na chapa, batatas crocantes e milkshakes cremosos.',
  phone: '+5511999990000',
  address: {
    zipCode: '04101300',
    street: 'Rua Vergueiro',
    number: '2045',
    neighborhood: 'Vila Mariana',
    city: 'São Paulo',
    state: 'SP',
  },
  minimumOrderInCents: 2500,
  deliveryEnabled: true,
  pickupEnabled: true,
  pickupEtaMinutes: 20,
};

export const OPENING_HOURS_SEED = [
  EWeekday.SUNDAY,
  EWeekday.MONDAY,
  EWeekday.TUESDAY,
  EWeekday.WEDNESDAY,
  EWeekday.THURSDAY,
].flatMap((weekday) => [
  { weekday, opensAt: '11:00', closesAt: '15:00' },
  { weekday, opensAt: '18:00', closesAt: '23:30' },
]).concat(
  [EWeekday.FRIDAY, EWeekday.SATURDAY].map((weekday) => ({
    weekday,
    opensAt: '11:00',
    closesAt: '02:00',
  })),
);
