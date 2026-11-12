/**
 * Conteúdo educativo sobre o Índice de Calor (M2) e Dicas de Proteção
 * em Ondas de Calor para trabalhadores de rua e cidadãos (M3).
 *
 * Fontes oficiais:
 * - Ministério da Saúde do Brasil (Recomendações de Vigilância em Saúde Ambiental
 *   para Ondas de Calor / Plano de Contingência para Emergências em Saúde Pública).
 * - Organização Mundial da Saúde (OMS) e NIOSH/CDC (Criteria for a Recommended
 *   Standard: Occupational Exposure to Heat and Hot Environments / NOAA Heat Index).
 */
import type { AlertLevel } from '../types/weather';

export interface HeatScaleDefinition {
  level: AlertLevel;
  label: string;
  generalRangeLabel: string;
  workerRangeLabel: string;
  meaning: string;
  recommendedAction: string;
}

export interface HeatComparisonItem {
  title: string;
  description: string;
}

export interface ProtectionTipSection {
  id: string;
  title: string;
  items: string[];
}

export const HEAT_INDEX_INTRO = {
  title: 'O que é o Índice de Calor?',
  summary:
    'O índice de calor combina a temperatura do ar com a umidade relativa para medir o calor real que o seu corpo enfrenta. Quando o ar está muito úmido, o suor demora a evaporar da pele e o organismo perde sua principal forma natural de resfriamento.',
  workerNote:
    'No perfil "Trabalho na rua" (entregadores, ciclistas, motociclistas e ambulantes), os alertas sobem 2 °C mais cedo porque o esforço físico contínuo e o calor do asfalto aumentam a carga térmica no corpo.',
} as const;

export const HEAT_COMPARISONS: readonly HeatComparisonItem[] = [
  {
    title: 'Temperatura do ar',
    description:
      'É o calor medido pelo termômetro em local abrigado do sol e da chuva.',
  },
  {
    title: 'Sensação térmica',
    description:
      'Leva em conta a temperatura somada ao efeito do vento e da radiação solar na pele.',
  },
  {
    title: 'Índice de calor (usado nos alertas)',
    description:
      'Calcula o estresse térmico fisiológico combinando temperatura e umidade relativa (equação de Rothfusz / NOAA). É o indicador mais seguro para prevenir desidratação e exaustão térmica.',
  },
];

export const HEAT_SCALE_LEVELS: readonly HeatScaleDefinition[] = [
  {
    level: 'normal',
    label: 'Normal',
    generalRangeLabel: 'Abaixo de 27 °C',
    workerRangeLabel: 'Abaixo de 25 °C',
    meaning: 'Conforto térmico para a maioria das atividades ao ar livre.',
    recommendedAction: 'Mantenha hidratação regular ao longo do turno.',
  },
  {
    level: 'atencao',
    label: 'Atenção',
    generalRangeLabel: '27 °C a 31,9 °C',
    workerRangeLabel: '25 °C a 29,9 °C',
    meaning: 'Possibilidade de fadiga após exposição prolongada ao sol e esforço físico.',
    recommendedAction: 'Beba água a cada 45–60 minutos e prefira aguardar pedidos na sombra.',
  },
  {
    level: 'cuidado',
    label: 'Cuidado',
    generalRangeLabel: '32 °C a 40,9 °C',
    workerRangeLabel: '30 °C a 38,9 °C',
    meaning: 'Risco moderado de cãibras térmicas e exaustão por calor em turnos longos.',
    recommendedAction: 'Beba água a cada 20–30 minutos e faça pausas em pontos de sombra.',
  },
  {
    level: 'perigo',
    label: 'Perigo',
    generalRangeLabel: '41 °C a 53,9 °C',
    workerRangeLabel: '39 °C a 51,9 °C',
    meaning: 'Alto risco de exaustão térmica grave e início de insolação se o esforço continuar.',
    recommendedAction:
      'Reduza o ritmo, faça pausas obrigatórias na sombra a cada 30–45 min e molhe nuca e pulsos.',
  },
  {
    level: 'perigo_extremo',
    label: 'Perigo Extremo',
    generalRangeLabel: '54 °C ou mais',
    workerRangeLabel: '52 °C ou mais',
    meaning: 'Risco iminente de insolação (hipertermia grave) — emergência médica.',
    recommendedAction:
      'Suspenda atividades pesadas sob o sol imediatamente e procure abrigo fresco ou ponto de apoio.',
  },
];

/** Níveis que exibem o botão de atalho para "Dicas para se proteger" (M3 - Opção 8A aprovada). */
export function shouldShowProtectionTips(level: AlertLevel): boolean {
  return level === 'cuidado' || level === 'perigo' || level === 'perigo_extremo';
}

export const PROTECTION_TIP_SECTIONS: readonly ProtectionTipSection[] = [
  {
    id: 'hidratacao_pausas',
    title: '1. Hidratação e Pausas para quem Trabalha na Rua',
    items: [
      'Beba de 200 a 250 ml de água fresca a cada 20 minutos, mesmo sem sentir sede (a sede já é sinal de desidratação inicial).',
      'Evite bebidas alcoólicas, energéticos ou excesso de café e refrigerantes açucarados, pois aceleram a perda de líquidos.',
      'A cada 45 a 60 minutos no sol, pare por 10 a 15 minutos em uma área sombreada, arborizada ou ponto parceiro.',
      'Use os bebedouros do mapa para molhar nuca, testa, pescoço e pulsos — isso resfria o sangue rapidamente.',
      'Prefira roupas claras, leves e de manga longa com proteção UV, além de protetor solar (FPS 30+) reaplicado a cada 2 horas.',
    ],
  },
  {
    id: 'sinais_exaustao',
    title: '2. Sinais de Exaustão pelo Calor (Pare Imediatamente)',
    items: [
      'Suor muito intenso acompanhado de pele fria e pálida.',
      'Tontura, visão turva, sensação de desmaio ou dor de cabeça latejante.',
      'Cãibras musculares nas pernas, braços ou abdômen.',
      'Náusea, enjoo, batimentos cardíacos acelerados e fraqueza súbita.',
      'O que fazer: interrompa a entrega/atividade na hora, vá para um local sombreado e ventilado, solte roupas apertadas/capacete e tome água aos poucos.',
    ],
  },
  {
    id: 'emergencia_insolacao',
    title: '3. Sinais de Insolação Grave (Emergência Médica — Ligue 192)',
    items: [
      'Pele muito quente, avermelhada e seca (o corpo para de suar) ou febre acima de 39 °C.',
      'Confusão mental, dificuldade para falar, desorientação ou perda de consciência.',
      'Vômitos persistentes que impedem a hidratação oral.',
      'Ação imediata: acione o SAMU (192) ou Bombeiros (193), leve a pessoa para a sombra e resfrie o corpo com panos molhados na nuca, axilas e virilha.',
    ],
  },
];

export const HEALTH_SOURCE_CITATION =
  'Fonte oficial: Ministério da Saúde do Brasil (Guia de Vigilância em Saúde e Recomendações para Ondas de Calor) e Organização Mundial da Saúde / NIOSH (Prevenção ao Estresse Térmico Ocupacional).';
