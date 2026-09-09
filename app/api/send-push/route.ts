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
      console.error("❌ Erreur : Clés VAPID manquantes dans les variables d'environnement Vercel.");
      return NextResponse.json({ error: 'Clés VAPID manquantes' }, { status: 500 });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const bodyData = await request.json();
    console.log("📥 Webhook reçu de Supabase. Type d'événement :", bodyData.type);
    
    if (bodyData.type !== 'INSERT' || !bodyData.record) {
      return NextResponse.json({ success: true, message: 'Non concerné (pas un INSERT)' });
    }

    const record = bodyData.record;
    const senderId = record.sender_id;
    const conversationId = record.conversation_id;
    const messageContent = record.content || 'Vous avez reçu un nouveau message';

    if (!conversationId || !senderId) {
      return NextResponse.json({ success: true, warning: 'Conversation ou émetteur manquant' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    // PRIORITÉ à la clé de service pour contourner la sécurité RLS lors du Webhook
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn("⚠️ Attention : Il manque la SUPABASE_SERVICE_ROLE_KEY sur Vercel, utilisation de la clé anon (risque de blocage RLS).");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Récupérer la conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error('❌ Erreur de lecture de la conversation (Vérifier les RLS) :', convError);
      return NextResponse.json({ success: true, warning: 'Impossible de trouver la conversation' });
    }

    // Déterminer le destinataire
    const recipientId = conversation.buyer_id === senderId 
      ? conversation.seller_id 
      : conversation.buyer_id;

    if (!recipientId) {
      return NextResponse.json({ success: true, message: 'Destinataire introuvable' });
    }

    console.log(`👤 Message de ${senderId} pour le destinataire ${recipientId}`);

    // 2. Récupérer l'abonnement push du destinataire
    const { data: subs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', recipientId);

    if (subError) {
      console.error("❌ Erreur lors de la récupération des abonnements :", subError);
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    if (!subs || subs.length === 0) {
      console.log("ℹ️ Aucun abonnement push trouvé en base de données pour ce destinataire.");
      return NextResponse.json({ success: true, message: 'Aucun abonnement push pour le destinataire' });
    }

    console.log(`📢 ${subs.length} abonnement(s) push trouvé(s). Envoi en cours...`);

    const payload = JSON.stringify({
      title: 'Nouveau message sur TrocTruc SPM',
      body: messageContent,
      url: '/messages'
    });

    await Promise.all(
      subs.map(async (row) => {
        try {
          // Sécurité : Si l'abonnement est stocké sous forme de chaîne de caractères, on le transforme en objet
          const subscriptionObject = typeof row.subscription === 'string' 
            ? JSON.parse(row.subscription) 
            : row.subscription;

          await webpush.sendNotification(subscriptionObject, payload);
          console.log(`✅ Notification envoyée avec succès pour l'abonnement ID : ${row.id}`);
        } catch (err: any) {
          console.error(`❌ Échec d'envoi pour l'abonnement ${row.id} (Code: ${err.statusCode}) :`, err.message);
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`🗑️ Nettoyage : Suppression de l'abonnement expiré ID ${row.id}`);
            await supabase.from('push_subscriptions').delete().eq('id', row.id);
          }
        }
      })
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('💥 Erreur critique dans le webhook push :', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
