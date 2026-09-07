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
  const [showTooltip, setShowTooltip] = useState(false);

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
    } catch (err) {
      console.error('Erreur vérification SW:', err);
    }
  }

  async function toggleSubscription() {
    if (!user) return;
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;

      if (isSubscribed) {
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
        }
        setIsSubscribed(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setLoading(false);
          return;
        }

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
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

        if (!error) {
          setIsSubscribed(true);
        }
      }
    } catch (err: any) {
      console.error('Erreur toggle push:', err);
    }
    setLoading(false);
    setShowTooltip(false);
  }

  if (isSupported === false || !user) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bouton Cloche SVG élégant */}
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
          transition: 'all 0.2s'
        }}
        title="Gérer les notifications"
      >
        {/* Icône Cloche SVG moderne */}
        <svg 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{ color: isSubscribed ? '#2563eb' : '#64748b' }}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          {!isSubscribed && <line x1="1" y1="1" x2="23" y2="23" stroke="#ef4444" strokeWidth="2"></line>}
        </svg>

        {!isSubscribed && (
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#e67e22', letterSpacing: '-0.2px' }}>
            Activer
          </span>
        )}
      </button>

      {/* Menu contextuel discret */}
      {showTooltip && (
        <div style={{
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
          boxSizing: 'border-box'
        }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#1e293b', lineHeight: '1.4' }}>
            {isSubscribed 
              ? 'Notifications activées sur cet appareil.' 
              : 'Recevez une alerte dès qu’on vous répond.'}
          </p>

          <button
            onClick={toggleSubscription}
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: isSubscribed ? '#ef4444' : '#2563eb',
              color: 'white',
              border: 'none',
              padding: '7px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Patientez...' : isSubscribed ? 'Désactiver' : 'Activer'}
          </button>
        </div>
      )}
    </div>
  );
}