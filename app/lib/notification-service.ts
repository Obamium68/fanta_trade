// app/lib/notification-service.ts
import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configura VAPID keys (genera con: npx web-push generate-vapid-keys)
webpush.setVapidDetails(
  'mailto:andrea.f.matera@gmail.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export class NotificationService {
  static async sendToTeam(teamId: number, payload: NotificationPayload, notificationType?: string) {
    try {
      // Verifica le preferenze di notifica se specificato il tipo
      if (notificationType) {
        const preferences = await prisma.notificationPreference.findUnique({
          where: { teamId }
        });
        
        if (preferences && !preferences[notificationType as keyof typeof preferences]) {
          console.log(`Team ${teamId} ha disabilitato le notifiche per ${notificationType}`);
          return;
        }
      }

      // Ottieni tutte le subscription attive per il team
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          teamId,
          isActive: true
        }
      });

      if (subscriptions.length === 0) {
        console.log(`Nessuna subscription attiva trovata per team ${teamId}`);
        return;
      }

      // Invia notifiche a tutti i dispositivi
      const promises = subscriptions.map(async (subscription) => {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          };

          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload)
          );
          
          console.log(`Notifica inviata con successo a team ${teamId}`);
        } catch (error: any) {
          console.error(`Errore invio notifica:`, error);
          
          // Se la subscription non è più valida, disattivala
          if (error.statusCode === 410 || error.statusCode === 404) {
            await prisma.pushSubscription.update({
              where: { id: subscription.id },
              data: { isActive: false }
            });
            console.log(`Subscription disattivata per team ${teamId}`);
          }
        }
      });

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Errore nel servizio notifiche:', error);
    }
  }

  // Notifiche specifiche per i trade
  static async notifyTradeProposed(tradeId: number, fromTeamName: string, toTeamId: number) {
    const payload: NotificationPayload = {
      title: '🔄 Nuova proposta di scambio',
      body: `${fromTeamName} ti ha proposto uno scambio`,
      icon: '/icon-192x192.png',
      tag: `trade-${tradeId}`,
      data: {
        type: 'TRADE_PROPOSED',
        tradeId,
        url: `/trades/${tradeId}`
      },
      actions: [
        {
          action: 'view',
          title: 'Visualizza'
        },
        {
          action: 'dismiss',
          title: 'Ignora'
        }
      ]
    };

    await this.sendToTeam(toTeamId, payload, 'newTradeReceived');
  }

  static async notifyTradeAccepted(tradeId: number, fromTeamId: number, toTeamName: string) {
    const payload: NotificationPayload = {
      title: '✅ Scambio accettato',
      body: `${toTeamName} ha accettato il tuo scambio`,
      icon: '/icon-192x192.png',
      tag: `trade-${tradeId}`,
      data: {
        type: 'TRADE_ACCEPTED',
        tradeId,
        url: `/trades/${tradeId}`
      }
    };

    await this.sendToTeam(fromTeamId, payload, 'tradeAccepted');
  }

  static async notifyTradeRejected(tradeId: number, fromTeamId: number, toTeamName: string) {
    const payload: NotificationPayload = {
      title: '❌ Scambio rifiutato',
      body: `${toTeamName} ha rifiutato il tuo scambio`,
      icon: '/icon-192x192.png',
      tag: `trade-${tradeId}`,
      data: {
        type: 'TRADE_REJECTED',
        tradeId,
        url: `/trades/${tradeId}`
      }
    };

    await this.sendToTeam(fromTeamId, payload, 'tradeRejected');
  }

  static async notifyTradeApproved(tradeId: number, fromTeamId: number, toTeamId: number) {
    const payload: NotificationPayload = {
      title: '🎉 Scambio approvato!',
      body: 'Il tuo scambio è stato approvato dall\'admin',
      icon: '/icon-192x192.png',
      tag: `trade-${tradeId}`,
      data: {
        type: 'TRADE_APPROVED',
        tradeId,
        url: `/trades/${tradeId}`
      }
    };

    // Notifica entrambi i team
    await Promise.all([
      this.sendToTeam(fromTeamId, payload, 'tradeApproved'),
      this.sendToTeam(toTeamId, payload, 'tradeApproved')
    ]);
  }
}