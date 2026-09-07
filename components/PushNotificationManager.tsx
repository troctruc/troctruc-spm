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
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      registerServiceWorker();
    }
  }, [user]);

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        setIsSubscribed(true);
      }
    } catch (err) {
      console.error('SW register error:', err);
    }
  }

  async function subscribeToPush() {
    if (!user) {
      alert('Veuillez vous connecter pour activer les alertes.');
      return;
    }

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidKey) {
        alert('Clé VAPID manquante.');
        setLoading(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      // Sauvegarder dans Supabase
      const { error } = await supabase.from('push_subscriptions').insert([
        {
          user_id: user.id,
          subscription: subscription.toJSON()
        }
      ]);

      if (error) {
        console.error(error);
        alert("Erreur lors de l'enregistrement : " + error.message);
      } else {
        setIsSubscribed(true);
        alert('🔔 Notifications activées avec succès !');
      }
    } catch (err: any) {
      console.error('Erreur inscription push:', err);
      alert('Impossible d’activer les notifications : ' + err.message);
    }
    setLoading(false);
  }

  if (!isSupported || !user || isSubscribed) {
    return null; // Ne s'affiche pas si non supporté ou déjà activé
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
      margin: '10px auto',
      maxWidth: '1000px'
    }}>
      <div style={{ fontSize: '13px', color: '#1e40af' }}>
        🔔 <strong>Restez prévenu :</strong> activez les alertes pour recevoir un message dès qu'on vous répond !
      </div>
      <button
        onClick={subscribeToPush}
        disabled={loading}
        style={{
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 'bold',
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }}
      >
        {loading ? 'Activation...' : 'Activer'}
      </button>
    </div>
  );
}