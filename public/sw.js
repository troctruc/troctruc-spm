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
      console.error("❌ Clés VAPID manquantes sur Vercel");
      return NextResponse.json({ error: 'Clés VAPID manquantes' }, { status: 500 });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const bodyData = await request.json();
    console.log("📥 [DIAGNOSTIC] Objet complet reçu de Supabase :", JSON.stringify(bodyData));
    
    // Extraction ultra-agressive du contenu du message
    let record = bodyData?.record || bodyData?.new || bodyData?.data || bodyData;
    
    if (typeof record === 'string') {
      try { record = JSON.parse(record); } catch(e) {}
    }

    // Détection de l'identifiant de la conversation (gère conversation_id, conversation, et les variantes)
    const conversationId = record?.conversation_id || record?.conversation || record?.conversationId;
    const senderId = record?.sender_id || record?.sender || record?.senderId;
    const messageContent = record?.content || 'Vous avez reçu un nouveau message';

    if (!conversationId) {
      console.warn("⚠️ Webhook ignoré : Impossible de trouver l'ID de la conversation dans :", JSON.stringify(record));
      return NextResponse.json({ success: true, message: 'ID conversation introuvable' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Clé secrète ou URL Supabase manquante dans Vercel.");
      return NextResponse.json({ error: 'Variables serveur manquantes' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 1. Récupération de la conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error(`❌ Impossible d'accéder à la conversation ID ${conversationId} :`, convError);
      return NextResponse.json({ success: true, warning: 'Ligne conversation introuvable ou RLS' });
    }

    // Déterminer le destinataire
    const recipientId = conversation.buyer_id === senderId ? conversation.seller_id : conversation.buyer_id;
    
    if (!recipientId) {
      console.warn("⚠️ Destinataire introuvable");
      return NextResponse.json({ success: true, message: 'Destinataire introuvable' });
    }

    console.log(`👤 Destinataire trouvé : ${recipientId}. Recherche des abonnements push...`);

    // 2. Récupération des abonnements push
    const { data: subs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', recipientId);

    if (subError || !subs || subs.length === 0) {
      console.log(`ℹ️ Aucun appareil enregistré (push_subscriptions) pour l'utilisateur ${recipientId}`);
      return NextResponse.json({ success: true, message: 'Zéro jeton trouvé' });
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
          const subscriptionObject = typeof row.subscription === 'string' ? JSON.parse(row.subscription) : row.subscription;
          await webpush.sendNotification(subscriptionObject, payload);
          console.log(`✅ Notification Push envoyée avec succès au terminal ID : ${row.id}`);
        } catch (err: any) {
          console.error(`❌ Erreur d'envoi VAPID :`, err.message);
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', row.id);
          }
        }
      })
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('💥 Erreur critique du script :', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
