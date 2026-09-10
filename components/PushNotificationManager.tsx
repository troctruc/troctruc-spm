'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((char) => char.charCodeAt(0))
  );
}

export default function PushNotificationManager({
  user,
}: {
  user: any;
}) {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    ) {
      setIsSupported(true);
      checkSubscription();
    } else {
      setIsSupported(false);
    }
  }, [user]);

  async function getRegistration() {
    await navigator.serviceWorker.register('/sw.js');
    return await navigator.serviceWorker.ready;
  }

  async function checkSubscription() {
    if (!user) {
      setIsSubscribed(false);
      return;
    }

    try {
      const registration = await getRegistration();

      const browserSubscription =
        await registration.pushManager.getSubscription();

      if (!browserSubscription) {
        setIsSubscribed(false);
        return;
      }

      const endpoint = browserSubscription.endpoint;

      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id, subscription')
        .eq('user_id', user.id);

      if (error) {
        console.error(
          'Erreur lecture push_subscriptions :',
          error
        );
        setIsSubscribed(false);
        return;
      }

      const exists = data?.some(
        (row) => row.subscription?.endpoint === endpoint
      );

      setIsSubscribed(Boolean(exists));
    } catch (err) {
      console.error('Erreur vérification SW :', err);
      setIsSubscribed(false);
    }
  }

  async function toggleSubscription() {
    if (!user) return;

    setLoading(true);

    try {
      const registration = await getRegistration();

      if (isSubscribed) {
        const sub = await registration.pushManager.getSubscription();

        if (sub) {
          const endpoint = sub.endpoint;

          const { data, error } = await supabase
            .from('push_subscriptions')
            .select('id, subscription')
            .eq('user_id', user.id);

          if (error) {
            throw error;
          }

          const currentDevice = data?.find(
            (row) => row.subscription?.endpoint === endpoint
          );

          if (currentDevice) {
            const { error: deleteError } = await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', currentDevice.id);

            if (deleteError) {
              throw deleteError;
            }
          }

          await sub.unsubscribe();
        }

        setIsSubscribed(false);
      } else {
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
          console.log('Permission notifications refusée');
          return;
        }

        const vapidKey =
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

        if (!vapidKey) {
          throw new Error(
            'NEXT_PUBLIC_VAPID_PUBLIC_KEY est absente'
          );
        }

        let subscription =
          await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription =
            await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey:
                urlBase64ToUint8Array(vapidKey),
            });
        }

        // Évite un doublon pour ce navigateur
        const { data: existing } = await supabase
          .from('push_subscriptions')
          .select('id, subscription')
          .eq('user_id', user.id);

        const alreadyStored = existing?.some(
          (row) =>
            row.subscription?.endpoint ===
            subscription?.endpoint
        );

        if (!alreadyStored) {
          const { error } = await supabase
            .from('push_subscriptions')
            .insert({
              user_id: user.id,
              subscription: subscription.toJSON(),
            });

          if (error) {
            throw error;
          }
        }

        setIsSubscribed(true);
      }
    } catch (err) {
      console.error('Erreur toggle push :', err);
    } finally {
      setLoading(false);
      setShowTooltip(false);
    }
  }

  if (isSupported === false || !user) return null;

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
      }}
    >
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '7px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#334155',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'all 0.2s',
        }}
        title="Gérer les notifications"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            color: isSubscribed ? '#2563eb' : '#64748b',
          }}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />

          {!isSubscribed && (
            <line
              x1="1"
              y1="1"
              x2="23"
              y2="23"
              stroke="#ef4444"
              strokeWidth="2"
            />
          )}
        </svg>

        {!isSubscribed && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: '600',
              color: '#e67e22',
            }}
          >
            Activer
          </span>
        )}
      </button>

      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: '45px',
            right: '0',
            width: '240px',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '12px',
            zIndex: 100,
            boxSizing: 'border-box',
          }}
        >
          <p
            style={{
              margin: '0 0 10px 0',
              fontSize: '12px',
              color: '#1e293b',
              lineHeight: '1.4',
            }}
          >
            {isSubscribed
              ? 'Notifications activées sur cet appareil.'
              : 'Recevez une alerte dès qu’on vous répond.'}
          </p>

          <button
            onClick={toggleSubscription}
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: isSubscribed
                ? '#ef4444'
                : '#2563eb',
              color: 'white',
              border: 'none',
              padding: '7px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading
              ? 'Patientez...'
              : isSubscribed
                ? 'Désactiver'
                : 'Activer'}
          </button>
        </div>
      )}
    </div>
  );
}