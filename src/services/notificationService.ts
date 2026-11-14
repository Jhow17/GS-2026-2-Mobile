/**
 * Serviço de notificações locais de calor extremo (expo-notifications).
 * Telas e hooks nunca importam expo-notifications diretamente.
 * Funciona 100% no cliente (sem backend e sem Firebase):
 * - Dispara alerta imediato quando o índice atual atinge faixa crítica (com cooldown no AsyncStorage);
 * - Agenda notificações locais preditivas a partir das próximas faixas de 3h da previsão.
 */
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import type { LocationPermissionState } from '../types/location';
import type { AlertLevel, WeatherBundle } from '../types/weather';
import { alertLevelLabels, formatHeatIndex, formatTime } from '../utils/formatters';
import { isRecord } from '../utils/validation';
import { readStoredJson, STORAGE_PREFIX, writeStoredJson } from './cacheStorage';

const LAST_HEAT_ALERT_KEY = `${STORAGE_PREFIX}last_heat_alert`;
const HEAT_CHANNEL_ID = 'heat-alerts';
const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 horas
const MAX_PREDICTIVE_SLOTS = 3;

const SEVERITY_ORDER: readonly AlertLevel[] = [
  'normal',
  'atencao',
  'cuidado',
  'perigo',
  'perigo_extremo',
];

interface LastHeatAlertRecord {
  level: AlertLevel;
  heatIndexC: number;
  notifiedAt: string;
}

let handlerInitialized = false;

function isAlertLevel(value: unknown): value is AlertLevel {
  return (
    value === 'normal' ||
    value === 'atencao' ||
    value === 'cuidado' ||
    value === 'perigo' ||
    value === 'perigo_extremo'
  );
}

function isLastHeatAlertRecord(value: unknown): value is LastHeatAlertRecord | null {
  if (value === null) {
    return true;
  }
  if (!isRecord(value)) {
    return false;
  }
  return (
    isAlertLevel(value.level) &&
    typeof value.heatIndexC === 'number' &&
    Number.isFinite(value.heatIndexC) &&
    typeof value.notifiedAt === 'string'
  );
}

function getSeverityRank(level: AlertLevel): number {
  return SEVERITY_ORDER.indexOf(level);
}

/**
 * Define se o nível exige notificação no sistema:
 * - Padrão: 'perigo' ou 'perigo_extremo';
 * - Modo "Trabalho na rua" (workerMode): antecipa a partir de 'cuidado'.
 */
export function shouldNotifyForLevel(level: AlertLevel, workerMode: boolean): boolean {
  const minLevel: AlertLevel = workerMode ? 'cuidado' : 'perigo';
  return getSeverityRank(level) >= getSeverityRank(minLevel);
}

/** Inicializa o handler de primeiro plano e o canal de alta prioridade no Android. */
export async function ensureNotificationSetup(): Promise<void> {
  if (!handlerInitialized) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerInitialized = true;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(HEAT_CHANNEL_ID, {
      name: 'Alertas de Calor Extremo',
      description: 'Avisos quando o índice de calor atinge níveis de risco para o trabalhador.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 200, 250],
      sound: 'default',
    });
  }
}

function toPermissionState(
  response: Notifications.NotificationPermissionsStatus,
): LocationPermissionState {
  if (response.granted) {
    return 'granted';
  }
  if (response.status === Notifications.PermissionStatus.UNDETERMINED) {
    return 'undetermined';
  }
  return response.canAskAgain ? 'denied' : 'blocked';
}

/** Lê o estado atual da permissão de notificações sem abrir diálogo. */
export async function getNotificationPermissionState(): Promise<LocationPermissionState> {
  try {
    const response = await Notifications.getPermissionsAsync();
    return toPermissionState(response);
  } catch {
    return 'undetermined';
  }
}

/** Solicita permissão de notificações ao sistema operacional. */
export async function requestNotificationPermission(): Promise<LocationPermissionState> {
  try {
    await ensureNotificationSetup();
    const response = await Notifications.requestPermissionsAsync();
    return toPermissionState(response);
  } catch {
    return 'denied';
  }
}

/** Abre as configurações do sistema quando a permissão foi bloqueada. */
export async function openNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}

function buildImmediateTrigger(): Notifications.NotificationTriggerInput {
  if (Platform.OS === 'android') {
    return { channelId: HEAT_CHANNEL_ID };
  }
  return null;
}

/** Cancela todos os alertas preditivos agendados. */
export async function cancelAllHeatNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Ignora falha silenciosa de agendamento em dispositivos sem suporte
  }
}

/**
 * Avalia o pacote climático atual:
 * 1. Se o nível atual for crítico e respeitar o cooldown de 2h (ou tiver agravado),
 *    dispara uma notificação imediata;
 * 2. Reagenda notificações locais futuras para as próximas faixas críticas da previsão.
 */
export async function syncHeatNotifications(
  bundle: WeatherBundle,
  workerMode: boolean,
): Promise<void> {
  const permission = await getNotificationPermissionState();
  if (permission !== 'granted') {
    return;
  }

  await ensureNotificationSetup();

  const currentLevel = bundle.alert.combinedLevel;
  const currentHeatC = bundle.alert.heatIndexC;
  const nowMs = Date.now();

  if (shouldNotifyForLevel(currentLevel, workerMode)) {
    const lastAlert = await readStoredJson<LastHeatAlertRecord | null>(
      LAST_HEAT_ALERT_KEY,
      isLastHeatAlertRecord,
      null,
    );

    const lastTimeMs = lastAlert ? new Date(lastAlert.notifiedAt).getTime() : 0;
    const elapsedMs = Number.isFinite(lastTimeMs) ? nowMs - lastTimeMs : COOLDOWN_MS + 1;
    const escalated =
      lastAlert !== null && getSeverityRank(currentLevel) > getSeverityRank(lastAlert.level);

    if (!lastAlert || elapsedMs >= COOLDOWN_MS || escalated) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Alerta de ${alertLevelLabels[currentLevel]}: Índice de calor em ${formatHeatIndex(currentHeatC)}`,
          body: 'Faça pausas longas na sombra, hidrate-se e veja o ponto de apoio mais próximo no CitizenTech.',
          data: { targetTab: 'Start', level: currentLevel },
          sound: 'default',
        },
        trigger: buildImmediateTrigger(),
      });

      const nextRecord: LastHeatAlertRecord = {
        level: currentLevel,
        heatIndexC: currentHeatC,
        notifiedAt: new Date(nowMs).toISOString(),
      };
      await writeStoredJson(LAST_HEAT_ALERT_KEY, nextRecord);
    }
  }

  // Reagenda alertas preditivos para as próximas 24h (mesmo que o app seja fechado depois)
  await cancelAllHeatNotifications();

  const upcomingCriticalSlots = bundle.forecast
    .filter((slot) => {
      const slotMs = new Date(slot.at).getTime();
      const inNext24h =
        Number.isFinite(slotMs) &&
        slotMs > nowMs + 5 * 60 * 1000 &&
        slotMs <= nowMs + 24 * 60 * 60 * 1000;
      return inNext24h && shouldNotifyForLevel(slot.level, workerMode);
    })
    .slice(0, MAX_PREDICTIVE_SLOTS);

  for (const slot of upcomingCriticalSlots) {
    const triggerDate = new Date(slot.at);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Previsão de ${alertLevelLabels[slot.level]} às ${formatTime(slot.at)} (${formatHeatIndex(slot.heatIndexC)})`,
        body: 'Prepare sua hidratação e planeje pausas nos pontos de apoio próximos.',
        data: { targetTab: 'Start', level: slot.level },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: HEAT_CHANNEL_ID,
      },
    });
  }
}

/** Dispara uma notificação imediata de demonstração para testar no aparelho. */
export async function sendTestHeatNotification(bundle: WeatherBundle | null): Promise<boolean> {
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return false;
  }

  const level: AlertLevel = bundle?.alert.combinedLevel ?? 'perigo';
  const heatIndexC = bundle?.alert.heatIndexC ?? 41.2;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Alerta de ${alertLevelLabels[level]}: Índice de calor em ${formatHeatIndex(heatIndexC)}`,
      body: 'Faça pausas longas na sombra, hidrate-se e veja o ponto de apoio mais próximo no CitizenTech.',
      data: { targetTab: 'Start', level },
      sound: 'default',
    },
    trigger: buildImmediateTrigger(),
  });
  return true;
}

/**
 * Assina o toque do usuário em qualquer notificação exibida pelo sistema.
 * Devolve a função de cleanup para o retorno do useEffect.
 */
export function subscribeToNotificationResponses(onOpenHeatAlert: () => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(() => {
    onOpenHeatAlert();
  });
  return () => {
    subscription.remove();
  };
}
