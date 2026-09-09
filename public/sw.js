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
    
    // Détection et extraction intelligente du record Supabase
    let record = null;
    if (bodyData && bodyData.record) {
      record = bodyData.record;
    } else if (bodyData && bodyData.new) {
      record = bodyData.new;
    } else {
      record = bodyData;
    }
    
    // Si l'objet est imbriqué dans une chaîne textuelle
    if (typeof record === 'string') {
      try { record = JSON.parse(record); } catch(e) {}
    }

    if (!record || (!record.conversation_id && !record.record?.conversation_id)) {
      console.warn("⚠️ Webhook ignoré : Impossible de localiser la variable conversation_id.");
      return NextResponse.json({ success: true, message: 'Données manquantes ou non lues' });
    }

    const conversationId = record.conversation_id || record.record?.conversation_id;
    const senderId = record.sender_id || record.record?.sender_id;
    const messageContent = record.content || record.record?.content || 'Vous avez reçu un nouveau message';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Utilisation de la clé admin secrète configurée tout à l'heure
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Configuration d'API Supabase introuvable ou illisible par le serveur NextJS.");
      return NextResponse.json({ error: 'Variables serveur manquantes' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 1. Identification de la conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error('❌ Impossible d\'accéder à la table conversations :', convError);
      return NextResponse.json({ success: true, warning: 'Lecture bloquée en base' });
    }

    const recipientId = conversation.buyer_id === senderId ? conversation.seller_id : conversation.buyer_id;
    if (!recipientId) return NextResponse.json({ success: true, message: 'Destinataire introuvable' });

    console.log(`👤 ID Destinataire identifié : ${recipientId}`);

    // 2. Récupération des abonnements push
    const { data: subs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', recipientId);

    if (subError || !subs || subs.length === 0) {
      console.log(`ℹ️ Aucun terminal enregistré pour l'utilisateur ${recipientId}`);
      return NextResponse.json({ success: true, message: 'Zéro jeton trouvé' });
    }

    const payload = JSON.stringify({
      title: 'Nouveau message sur TrocTruc SPM',
      body: messageContent,
      url: '/messages'
    });

    // 3. Distribution de la notification push
    await Promise.all(
      subs.map(async (row) => {
        try {
          const subscriptionObject = typeof row.subscription === 'string' ? JSON.parse(row.subscription) : row.subscription;
          await webpush.sendNotification(subscriptionObject, payload);
          console.log(`✅ Push envoyé à l'abonnement ID : ${row.id}`);
        } catch (err: any) {
          console.error(`❌ Erreur webpush :`, err.message);
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', row.id);
          }
        }
      })
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('💥 Plantage critique :', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
