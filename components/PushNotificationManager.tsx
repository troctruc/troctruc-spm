'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationManager({ user }: { user: any }) {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    } else {
      setIsSupported(false);
    }
  }, [user]);

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        setIsSubscribed(true);
      }
    } catch (err: any) {
      console.error('Erreur vérification SW:', err);
      setStatusMsg('Erreur SW: ' + err.message);
    }
  }

  async function subscribeToPush() {
    if (!user) {
      alert('Veuillez vous connecter pour activer les alertes.');
      return;
    }

    setLoading(true);
    setStatusMsg('');

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Permission refusée par le navigateur.');
        setLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidKey) {
        alert('Erreur: Variable NEXT_PUBLIC_VAPID_PUBLIC_KEY absente.');
        setLoading(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      const { error } = await supabase.from('push_subscriptions').insert([
        {
          user_id: user.id,
          subscription: subscription.toJSON()
        }
      ]);

      if (error) {
        alert("Erreur Supabase : " + error.message);
      } else {
        setIsSubscribed(true);
        alert('🔔 Notifications activées avec succès !');
      }
    } catch (err: any) {
      console.error('Erreur activation push:', err);
      alert('Erreur: ' + err.message);
    }
    setLoading(false);
  }

  return (
    <div style={{
      backgroundColor: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: '8px',
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      margin: '15px auto',
      maxWidth: '1000px',
      boxSizing: 'border-box'
    }}>
      <div style={{ fontSize: '13px', color: '#1e40af' }}>
        🔔 <strong>Notifications :</strong> {isSubscribed ? 'Alertes déjà activées sur cet appareil ✓' : 'Recevez une alerte dès qu’on vous répond.'}
        {statusMsg && <span style={{ color: '#dc2626', marginLeft: '8px' }}>({statusMsg})</span>}
      </div>

      {!isSubscribed ? (
        <button
          onClick={subscribeToPush}
          disabled={loading || isSupported === false}
          style={{
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            padding: '7px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Activation...' : 'Activer'}
        </button>
      ) : (
        <span style={{ fontSize: '12px', color: '#166534', fontWeight: 'bold' }}>Activé</span>
      )}
    </div>
  );
}