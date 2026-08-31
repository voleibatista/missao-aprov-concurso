import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function garantirPermissaoNotificacoes() {
  const atual = await Notifications.getPermissionsAsync();

  if (atual.status === 'granted') {
    return true;
  }

  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.status === 'granted';
}

export async function agendarLembreteEstudo({
  data,
  hora,
  minuto = 0,
  disciplina,
  taskId,
}: {
  data: string;
  hora: number;
  minuto?: number;
  disciplina: string;
  taskId?: string;
}) {
  const permitido = await garantirPermissaoNotificacoes();

  if (!permitido) {
    throw new Error('Permissão para notificações não concedida.');
  }

  const [ano, mes, dia] = data.split('-').map(Number);

  const quando = new Date(
    ano,
    mes - 1,
    dia,
    hora,
    minuto,
    0
  );

  if (quando.getTime() <= Date.now()) {
    return null;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Hora de estudar 📚',
      body: `Sua tarefa de ${disciplina} está esperando por você.`,
      data: {
        task_id: taskId || null,
        screen: '/calendario-estudos',
      },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: quando,
    },
  });

  return id;
}

export async function cancelarLembrete(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
}
