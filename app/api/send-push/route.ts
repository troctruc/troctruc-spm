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
    console.log("📥 Données complètes du Webhook reçues :", JSON.stringify(bodyData));
    
    // Extraction ultra-sécurisée du record envoyé par Supabase
    let record = null;
    if (bodyData && bodyData.record) {
      record = bodyData.record;
    } else if (bodyData && bodyData.new) {
      record = bodyData.new; // Gère le format de réplication de Supabase
    } else {
      record = bodyData;
    }
    
    if (!record || !record.conversation_id) {
      console.warn("⚠️ Webhook ignoré : Aucun champ conversation_id trouvé.");
      return NextResponse.json({ success: true, message: 'Non concerné ou données manquantes' });
    }

    const senderId = record.sender_id;
    const conversationId = record.conversation_id;
    const messageContent = record.content || 'Vous avez reçu un nouveau message';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Configuration Supabase incomplète sur Vercel. URL ou clé secrète introuvable.");
      return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
    }

    // Initialisation du client admin de Supabase
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // 1. Récupérer la conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error('❌ Erreur critique de lecture de la conversation :', convError);
      return NextResponse.json({ success: true, warning: 'Impossible de lire la conversation' });
    }

    // Déterminer le destinataire
    const recipientId = conversation.buyer_id === senderId 
      ? conversation.seller_id 
      : conversation.buyer_id;

    if (!recipientId) {
      return NextResponse.json({ success: true, message: 'Destinataire introuvable' });
    }

    console.log(`👤 Destinataire ciblé pour la notification : ${recipientId}`);

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
      console.log(`ℹ️ Aucun abonnement push en base de données pour l'utilisateur ${recipientId}`);
      return NextResponse.json({ success: true, message: 'Aucun abonnement push trouvé.' });
    }

    const payload = JSON.stringify({
      title: 'Nouveau message sur TrocTruc SPM',
      body: messageContent,
      url: '/messages'
    });

    await Promise.all(
      subs.map(async (row) => {
        try {
          const subscriptionObject = typeof row.subscription === 'string' 
            ? JSON.parse(row.subscription) 
            : row.subscription;

          await webpush.sendNotification(subscriptionObject, payload);
          console.log(`✅ Notification Push envoyée avec succès ! ID: ${row.id}`);
        } catch (err: any) {
          console.error(`❌ Échec d'envoi pour l'abonnement ${row.id} :`, err.message);
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', row.id);
          }
        }
      })
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('💥 Erreur générale interceptée :', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
