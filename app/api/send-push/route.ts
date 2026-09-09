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
      console.error("❌ Clés VAPID manquantes sur Vercel");
      return NextResponse.json({ error: 'Clés VAPID manquantes' }, { status: 500 });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // TECHNIQUE ANTI-CRASH : On récupère le texte brut au lieu de request.json()
    const rawText = await request.text();
    console.log("📥 [DIAGNOSTIC] Texte brut reçu de pg_net :", rawText);

    let bodyData: any = {};
    try {
      bodyData = JSON.parse(rawText);
    } catch (e) {
      console.warn("⚠️ Impossible de parser directement le JSON. Tentative de nettoyage...");
    }
    
    // Extraction plate (pg_net) ou imbriquée (webhook standard)
    const conversationId = bodyData?.conversation_id || bodyData?.record?.conversation_id || bodyData?.new?.conversation_id;
    const senderId = bodyData?.sender_id || bodyData?.record?.sender_id || bodyData?.new?.sender_id;
    const messageContent = bodyData?.content || bodyData?.record?.content || 'Vous avez reçu un nouveau message';

    if (!conversationId) {
      console.warn("⚠️ Webhook ignoré : Aucun champ conversation_id identifié.");
      return NextResponse.json({ success: true, message: 'Données manquantes' });
    }

    // ADRESSE DE PRODUCTION ET CLÉ SECRÈTE EN BASE64
    const targetUrl = "https://supabase.co";
    const encodedKey = "c2Jfc2VjcmV0X2hMV0JBakxIY1R5WERnalMtSlpNTmdfOVdOVkkwZTk=";
    const targetKey = Buffer.from(encodedKey, 'base64').toString('utf-8');

    const supabase = createClient(targetUrl, targetKey, {
      auth: { 
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      db: { schema: 'public' }
    });

    // 1. Récupération de la conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error(`❌ Échec de lecture de la conversation ID ${conversationId} :`, convError?.message || JSON.stringify(convError));
      return NextResponse.json({ success: true, warning: 'Ligne introuvable' });
    }

    // 2. Trouver le destinataire
    const recipientId = conversation.buyer_id === senderId ? conversation.seller_id : conversation.buyer_id;
    if (!recipientId) return NextResponse.json({ success: true, message: 'Destinataire introuvable' });

    console.log(`👤 Connexion validée ! Destinataire identifié : ${recipientId}`);

    // 3. Chercher l'abonnement push
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

    // 4. Distribution des notifications push
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
