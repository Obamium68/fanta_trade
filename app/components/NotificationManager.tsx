"use client"
import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Settings } from 'lucide-react';

interface NotificationPreferences {
  tradeProposed: boolean;
  tradeAccepted: boolean;
  tradeRejected: boolean;
  tradeApproved: boolean;
  newTradeReceived: boolean;
}

const NotificationManager = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    tradeProposed: true,
    tradeAccepted: true,
    tradeRejected: true,
    tradeApproved: true,
    newTradeReceived: true,
  });
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    // Controlla se le notifiche sono supportate
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscriptionStatus();
      loadPreferences();
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    } catch (error) {
      console.error('Errore nel controllo subscription:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setPreferences(data.preferences);
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento preferenze:', error);
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Le notifiche non sono supportate dal tuo browser');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToNotifications = async () => {
    setLoading(true);
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        alert('Permesso per le notifiche negato');
        setLoading(false);
        return;
      }

      // Registra service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Crea subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
      });

      // Invia subscription al server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      if (response.ok) {
        setIsSubscribed(true);
        alert('Notifiche attivate con successo!');
      } else {
        throw new Error('Errore nel salvataggio della subscription');
      }
    } catch (error) {
      console.error('Errore nella subscription:', error);
      alert("Errore nell'attivazione delle notifiche");
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromNotifications = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          
          // Notifica il server
          await fetch('/api/notifications/unsubscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
        }
      }
      setIsSubscribed(false);
      alert('Notifiche disattivate');
    } catch (error) {
      console.error('Errore nella disattivazione:', error);
      alert('Errore nella disattivazione delle notifiche');
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPreferences),
      });

      if (response.ok) {
        setPreferences(updatedPreferences);
      } else {
        throw new Error('Errore nel salvataggio delle preferenze');
      }
    } catch (error) {
      console.error('Errore aggiornamento preferenze:', error);
      alert('Errore nel salvataggio delle preferenze');
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          Le notifiche push non sono supportate dal tuo browser
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Bell className="w-5 h-5" />
        Notifiche Push
      </h2>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              Stato: {isSubscribed ? 'Attivate' : 'Disattivate'}
            </p>
            <p className="text-sm text-gray-600">
              Ricevi notifiche per i tuoi scambi
            </p>
          </div>
          
          <button
            onClick={isSubscribed ? unsubscribeFromNotifications : subscribeToNotifications}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
              isSubscribed 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } disabled:opacity-50`}
          >
            {loading ? (
              'Caricamento...'
            ) : isSubscribed ? (
              <>
                <BellOff className="w-4 h-4" />
                Disattiva
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                Attiva
              </>
            )}
          </button>
        </div>

        {isSubscribed && (
          <>
            <hr className="my-4" />
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Preferenze
              </h3>
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className="text-blue-500 hover:text-blue-600 text-sm"
              >
                {showPreferences ? 'Nascondi' : 'Mostra'}
              </button>
            </div>

            {showPreferences && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <div className="grid gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={preferences.newTradeReceived}
                      onChange={(e) => updatePreferences({ newTradeReceived: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Nuove proposte ricevute</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={preferences.tradeAccepted}
                      onChange={(e) => updatePreferences({ tradeAccepted: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Scambi accettati</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={preferences.tradeRejected}
                      onChange={(e) => updatePreferences({ tradeRejected: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Scambi rifiutati</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={preferences.tradeApproved}
                      onChange={(e) => updatePreferences({ tradeApproved: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Scambi approvati</span>
                  </label>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationManager;