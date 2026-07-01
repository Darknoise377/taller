export interface MotorcycleModel {
  slug: string;
  name: string;
  brand: string;
  keywords: string[];
  description: string;
  faqs: Array<{ question: string; answer: string }>;
}

export const MOTORCYCLE_MODELS: MotorcycleModel[] = [
  {
    slug: 'pulsar-ns200',
    name: 'Pulsar NS200',
    brand: 'Bajaj',
    keywords: ['pulsar ns200', 'bajaj ns200', '200cc', 'motocicleta'],
    description: 'Repuestos originales y genéricos para Bajaj Pulsar NS200. Frenos, llantas, escape, aceites y todo lo necesario para mantener tu moto en óptimas condiciones.',
    faqs: [
      {
        question: '¿Qué tipo de aceite recomendado para Pulsar NS200?',
        answer: 'Para el Pulsar NS200 se recomienda aceite 10W-30 o 5W-30 sintético de marca reconocida. El motor de 200cc requiere aproximadamente 1.2 litros.',
      },
      {
        question: '¿Cuál es el intervalo de cambio de cadena?',
        answer: 'La cadena del NS200 debe lubricarse cada 500 km y ajustarse según el desgaste. Reemplazar cada 15,000-20,000 km o cuando tenga 10 hilos tiernos.',
      },
    ],
  },
  {
    slug: 'dominar-400',
    name: 'Dominar 400',
    brand: 'Bajaj',
    keywords: ['dominar 400', 'bajaj dominar', '400cc', 'motocicleta'],
    description: 'Repuestos para Bajaj Dominar 400. Cilindros, pistones, válvulas, bujías y componentes para el motor de alto cilindraje.',
    faqs: [
      {
        question: '¿Qué repuestos son más críticos para Dominar 400?',
        answer: 'Los componentes del sistema de refrigeración y el sistema de combustible son críticos. Verifica siempre el filtro de aceite y la bomba de agua.',
      },
    ],
  },
  {
    slug: 'ktm-duke-200',
    name: 'Duke 200',
    brand: 'KTM',
    keywords: ['ktm duke 200', 'duke 200', 'ktm 200', 'motocicleta'],
    description: 'Repuestos para KTM Duke 200. Piezas originales de alta calidad para la motocicleta más ligera de KTM.',
    faqs: [
      {
        question: '¿Dónde encuentro repuestos para KTM Duke 200?',
        answer: 'En Motoservicio A&R tienes repuestos completos para Duke 200: filtros, bujías, pastillas de freno, cadenas y todo lo necesario.',
      },
    ],
  },
  {
    slug: 'ktm-duke-390',
    name: 'Duke 390',
    brand: 'KTM',
    keywords: ['ktm duke 390', 'duke 390', 'ktm 390', 'motocicleta'],
    description: 'Repuestos para KTM Duke 390. Componentes para el motor de 390cc y la suspensión de alta gama.',
    faqs: [
      {
        question: '¿Qué tipo de refrigerante usar en Duke 390?',
        answer: 'El Duke 390 requiere refrigerante de color rojo o naranja según especificaciones KTM, con concentración óptima de 50%.',
      },
    ],
  },
  {
    slug: 'apache-rtr-200',
    name: 'Apache RTR 200',
    brand: 'TVS',
    keywords: ['apache rtr 200', 'tvs apache', '200cc', 'motocicleta'],
    description: 'Repuestos originales y genéricos para TVS Apache RTR 200. Todo para el cuidado y mantenimiento de tu moto.',
    faqs: [
      {
        question: '¿Cuánta presión debe tener la llanta del RTR 200?',
        answer: 'La presión recomendada es 2.2-2.5 bar (30-36 PSI) en la llanta delantera y trasera.',
      },
    ],
  },
  {
    slug: 'xtz-125',
    name: 'XTZ 125',
    brand: 'Yamaha',
    keywords: ['xtz 125', 'yamaha xtz', '125cc', 'motocicleta'],
    description: 'Repuestos para Yamaha XTZ 125. Ideal para uso urbano y carretera, con piezas duraderas.',
    faqs: [
      {
        question: '¿Qué requisitos de mantenimiento tiene el XTZ 125?',
        answer: 'Cambio de aceite cada 3,000 km, filtro de aire cada 6,000 km, y revisión del sistema de transmisión.',
      },
    ],
  },
];

export function getMotorcycleModel(slug: string): MotorcycleModel | undefined {
  return MOTORCYCLE_MODELS.find((m) => m.slug === slug);
}