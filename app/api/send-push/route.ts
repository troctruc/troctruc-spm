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

    // Lecture des données plates envoyées par pg_net
    const bodyData = await request.json();
    console.log("📥 [DIAGNOSTIC] Objet complet reçu de Supabase :", JSON.stringify(bodyData));
    
    // Extraction directe à la racine (format pg_net) ou imbriquée (format webhook standard)
    const conversationId = bodyData?.conversation_id || bodyData?.record?.conversation_id || bodyData?.new?.conversation_id;
    const senderId = bodyData?.sender_id || bodyData?.record?.sender_id || bodyData?.new?.sender_id;
    const messageContent = bodyData?.content || bodyData?.record?.content || 'Vous avez reçu un nouveau message';

    if (!conversationId) {
      console.warn("⚠️ Ignoré : ID conversation manquant dans l'objet reçu.");
      return NextResponse.json({ success: true, message: 'Aucun ID conversation' });
    }

    // 1. URL de production en dur pour votre projet Supabase
    const supabaseUrl = "https://supabase.co";
    
    // 2. Lecture de la clé secrète dans les variables Vercel
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseKey) {
      console.error("❌ Erreur : La clé SUPABASE_SERVICE_ROLE_KEY est introuvable dans l'environnement Vercel.");
      return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
    }

    // Initialisation en mode direct sans cache
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { 'Cache-Control': 'no-cache' } }
    });

    // 1. Trouver la conversation en base
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error(`❌ Erreur de lecture de la conversation ID ${conversationId} :`, convError?.message);
      return NextResponse.json({ success: true, warning: 'Ligne introuvable ou blocage RLS' });
    }

    // 2. Déterminer l'ID du destinataire
    const recipientId = conversation.buyer_id === senderId ? conversation.seller_id : conversation.buyer_id;
    if (!recipientId) {
      console.warn("⚠️ Destinataire introuvable pour cette action.");
      return NextResponse.json({ success: true, message: 'Pas de destinataire' });
    }

    console.log(`👤 Destinataire ciblé : ${recipientId}. Recherche de jetons push...`);

    // 3. Chercher l'abonnement push de ce destinataire
    const { data: subs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', recipientId);

    if (subError || !subs || subs.length === 0) {
      console.log(`ℹ️ Aucun appareil enregistré en base pour le destinataire ${recipientId}`);
      return NextResponse.json({ success: true, message: 'Aucun jeton enregistré' });
    }

    const payload = JSON.stringify({
      title: 'Nouveau message sur TrocTruc SPM',
      body: messageContent,
      url: '/messages'
    });

    // 4. Envoi de la notification
    await Promise.all(
      subs.map(async (row) => {
        try {
          const subObj = typeof row.subscription === 'string' ? JSON.parse(row.subscription) : row.subscription;
          await webpush.sendNotification(subObj, payload);
          console.log(`✅ Notification envoyée avec succès au terminal ID : ${row.id}`);
        } catch (err: any) {
          console.error(`❌ Échec d'envoi VAPID pour ${row.id} :`, err.message);
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', row.id);
          }
        }
      })
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('💥 Erreur critique générale :', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
