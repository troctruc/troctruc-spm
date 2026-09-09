export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = 'mailto:contact.troctruc@gmail.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ error: 'Clés VAPID manquantes' }, { status: 500 });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const bodyData = await request.json();
    console.log("📥 [DIAGNOSTIC] Objet reçu :", JSON.stringify(bodyData));
    
    // Extraction plate (pg_net) ou imbriquée (webhook visuel)
    const conversationId = bodyData?.conversation_id || bodyData?.record?.conversation_id || bodyData?.new?.conversation_id;
    const senderId = bodyData?.sender_id || bodyData?.record?.sender_id || bodyData?.new?.sender_id;
    const messageContent = bodyData?.content || bodyData?.record?.content || 'Vous avez reçu un nouveau message';

    if (!conversationId) {
      console.warn("⚠️ Ignoré : ID conversation manquant");
      return NextResponse.json({ success: true, message: 'Aucun ID conversation' });
    }

    const supabaseUrl = "https://supabase.co";
    
    // ON FORCE L'UTILISATION DE VOTRE VRAIE CLÉ MASTER HISTORIQUE DE VERCEL (eyJ...)
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseKey) {
      console.error("❌ La variable SUPABASE_SERVICE_ROLE_KEY est vide sur Vercel");
      return NextResponse.json({ error: 'Clé d’administration manquante' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { 'Cache-Control': 'no-cache' } }
    });

    // 1. Trouver la conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error('❌ Échec de lecture de la conversation :', convError?.message || JSON.stringify(convError));
      return NextResponse.json({ success: true, warning: 'Ligne introuvable ou problème de droits' });
    }

    const recipientId = conversation.buyer_id === senderId ? conversation.seller_id : conversation.buyer_id;
    if (!recipientId) return NextResponse.json({ success: true, message: 'Pas de destinataire' });

    console.log(`👤 Connexion validée ! Destinataire identifié : ${recipientId}`);

    // 2. Chercher l'abonnement push
    const { data: subs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', recipientId);

    if (subError || !subs || subs.length === 0) {
      console.log(`ℹ️ Aucun abonnement actif en base de données pour ${recipientId}`);
      return NextResponse.json({ success: true, message: 'Aucun jeton enregistré' });
    }

    const payload = JSON.stringify({
      title: 'Nouveau message sur TrocTruc SPM',
      body: messageContent,
      url: '/messages'
    });

    // 3. Envoi du push
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
    console.error('💥 Erreur critique script :', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
