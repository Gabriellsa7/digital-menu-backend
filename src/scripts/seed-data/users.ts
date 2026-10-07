import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';

export const STAFF_USERS_SEED = [
  {
    name: 'Ana Dona',
    email: 'owner@digitalmenu.dev',
    password: 'owner12345',
    role: EStaffRole.OWNER,
  },
  {
    name: 'Bruno Atendente',
    email: 'staff@digitalmenu.dev',
    password: 'staff12345',
    role: EStaffRole.STAFF,
  },
];

export const DEMO_CUSTOMER_SEED = {
  phone: '+5511988887777',
  name: 'Cliente Demo',
  address: {
    label: 'Casa',
    zipCode: '04101300',
    street: 'Rua Domingos de Morais',
    number: '1200',
    complement: 'Apto 42',
    neighborhood: 'Vila Mariana',
    city: 'São Paulo',
    state: 'SP',
  },
};
