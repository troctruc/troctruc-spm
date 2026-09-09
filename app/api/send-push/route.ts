export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:contact.troctruc@gmail.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ error: 'Clés VAPID manquantes' }, { status: 500 });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const bodyData = await request.json();
    
    const conversationId = bodyData?.conversation_id || bodyData?.record?.conversation_id || bodyData?.new?.conversation_id;
    const senderId = bodyData?.sender_id || bodyData?.record?.sender_id || bodyData?.new?.sender_id;
    const messageContent = bodyData?.content || bodyData?.record?.content || 'Vous avez reçu un nouveau message';

    if (!conversationId) {
      return NextResponse.json({ success: true, message: 'Aucun ID conversation' });
    }

    const supabaseUrl = "https://supabase.co";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseKey) {
      return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
    }

    // NOUVELLE CONFIGURATION : Forçage du schéma public et désactivation stricte des options fetch complexes
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { 
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      }
    });

    // 1. Trouver la conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      // Modifié pour afficher l'erreur proprement si Supabase boude encore
      const errorDetails = convError ? JSON.stringify(convError) : 'Ligne introuvable';
      console.error('❌ Impossible de lire la table conversations :', errorDetails);
      return NextResponse.json({ success: true, warning: 'Ligne introuvable' });
    }

    const recipientId = conversation.buyer_id === senderId ? conversation.seller_id : conversation.buyer_id;
    if (!recipientId) return NextResponse.json({ success: true, message: 'Pas de destinataire' });

    console.log(`👤 Destinataire cible identifié : ${recipientId}`);

    // 2. Chercher l'abonnement push
    const { data: subs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', recipientId);

    if (subError || !subs || subs.length === 0) {
      console.log(`ℹ️ Aucun abonnement actif pour ${recipientId}`);
      return NextResponse.json({ success: true, message: 'Aucun jeton enregistré' });
    }

    const payload = JSON.stringify({
      title: 'Nouveau message sur TrocTruc SPM',
      body: messageContent,
      url: '/messages'
    });

    // 3. Envoi
    await Promise.all(
      subs.map(async (row) => {
        try {
          const subObj = typeof row.subscription === 'string' ? JSON.parse(row.subscription) : row.subscription;
          await webpush.sendNotification(subObj, payload);
          console.log(`✅ Notification push transmise au terminal ID : ${row.id}`);
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', row.id);
          }
        }
      })
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('💥 Erreur critique :', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
