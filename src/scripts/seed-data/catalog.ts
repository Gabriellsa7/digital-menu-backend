export interface IOptionGroupSeed {
  key: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  allowRepeat: boolean;
  options: [string, number][];
}

export interface IProductSeed {
  name: string;
  description: string;
  priceInCents: number;
  groups?: string[];
  servesPeople?: number;
  isAvailable?: boolean;
}

export interface ICategorySeed {
  name: string;
  products: IProductSeed[];
}

export const OPTION_GROUPS_SEED: IOptionGroupSeed[] = [
  {
    key: 'doneness',
    name: 'Ponto da carne',
    minSelections: 1,
    maxSelections: 1,
    allowRepeat: false,
    options: [['Mal passado', 0], ['Ao ponto', 0], ['Bem passado', 0]],
  },
  {
    key: 'bread',
    name: 'Pão',
    minSelections: 1,
    maxSelections: 1,
    allowRepeat: false,
    options: [['Brioche', 0], ['Australiano', 200], ['Sem glúten', 400]],
  },
  {
    key: 'extras',
    name: 'Adicionais',
    minSelections: 0,
    maxSelections: 5,
    allowRepeat: true,
    options: [['Bacon', 500], ['Cheddar', 400], ['Ovo', 300], ['Cebola caramelizada', 300], ['Blend extra', 900]],
  },
  {
    key: 'combo-drink',
    name: 'Bebida do combo',
    minSelections: 1,
    maxSelections: 1,
    allowRepeat: false,
    options: [['Coca-Cola lata', 0], ['Guaraná lata', 0], ['Suco de laranja', 300]],
  },
  {
    key: 'sauces',
    name: 'Molhos',
    minSelections: 0,
    maxSelections: 3,
    allowRepeat: false,
    options: [['Maionese da casa', 0], ['Barbecue', 0], ['Mostarda e mel', 0], ['Picante', 0]],
  },
];

const BURGER = ['doneness', 'bread', 'extras', 'sauces'];

export const CATALOG_SEED: ICategorySeed[] = [
  {
    name: 'Smash burgers',
    products: [
      { name: 'Smash clássico', description: 'Blend 90 g, queijo prato e picles.', priceInCents: 2690, groups: BURGER },
      { name: 'Smash duplo', description: 'Dois blends de 90 g, cheddar duplo e cebola.', priceInCents: 3490, groups: BURGER },
      { name: 'Smash bacon', description: 'Blend 90 g, bacon crocante e maionese defumada.', priceInCents: 3290, groups: BURGER },
      { name: 'Smash salada', description: 'Blend 90 g, alface, tomate e cebola roxa.', priceInCents: 2890, groups: BURGER },
      { name: 'Smash trufado', description: 'Blend 90 g, maionese trufada e cogumelos.', priceInCents: 3990, groups: BURGER, isAvailable: false },
    ],
  },
  {
    name: 'Combos',
    products: [
      { name: 'Combo clássico', description: 'Smash clássico, fritas pequenas e bebida.', priceInCents: 3990, groups: ['doneness', 'bread', 'combo-drink'] },
      { name: 'Combo duplo', description: 'Smash duplo, fritas médias e bebida.', priceInCents: 4790, groups: ['doneness', 'bread', 'combo-drink'] },
      { name: 'Combo casal', description: 'Dois smash clássicos, fritas grandes e duas bebidas.', priceInCents: 7990, groups: ['combo-drink'], servesPeople: 2 },
    ],
  },
  {
    name: 'Acompanhamentos',
    products: [
      { name: 'Fritas', description: 'Batatas rústicas com sal e alecrim.', priceInCents: 1490, groups: ['sauces'] },
      { name: 'Fritas com cheddar e bacon', description: 'Fritas cobertas com cheddar cremoso e bacon.', priceInCents: 2290, servesPeople: 2 },
      { name: 'Onion rings', description: 'Anéis de cebola empanados.', priceInCents: 1790, groups: ['sauces'] },
      { name: 'Nuggets (10 un.)', description: 'Nuggets de frango crocantes.', priceInCents: 1990, groups: ['sauces'] },
    ],
  },
  {
    name: 'Bebidas',
    products: [
      { name: 'Coca-Cola lata', description: '350 ml.', priceInCents: 700 },
      { name: 'Guaraná lata', description: '350 ml.', priceInCents: 650 },
      { name: 'Água com gás', description: '500 ml.', priceInCents: 500 },
      { name: 'Suco de laranja', description: '400 ml, natural.', priceInCents: 1100 },
      { name: 'Limonada suíça', description: '400 ml.', priceInCents: 1200 },
    ],
  },
  {
    name: 'Milkshakes',
    products: [
      { name: 'Milkshake de chocolate', description: '400 ml com calda de chocolate belga.', priceInCents: 1890 },
      { name: 'Milkshake de morango', description: '400 ml com morangos frescos.', priceInCents: 1890 },
      { name: 'Milkshake de Ovomaltine', description: '400 ml com flocos crocantes.', priceInCents: 1990 },
    ],
  },
  {
    name: 'Sobremesas',
    products: [
      { name: 'Brownie', description: 'Brownie de chocolate meio amargo.', priceInCents: 1290 },
      { name: 'Cookie', description: 'Cookie de gotas de chocolate.', priceInCents: 890 },
      { name: 'Petit gâteau', description: 'Com sorvete de creme.', priceInCents: 2190 },
    ],
  },
];
