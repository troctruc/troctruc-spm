export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // 1. RÉCUPÉRATION DES CLÉS VAPID (GÉRÉ VIA L'ENVIRONNEMENT VERCEL)
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = 'mailto:contact.troctruc@gmail.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("❌ Clés VAPID manquantes dans les variables d'environnement Vercel.");
      return NextResponse.json({ error: 'Clés VAPID manquantes' }, { status: 500 });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // 2. EXTRACTION DES DONNÉES DU WEBHOOK SUPABASE
    const bodyData = await request.json();
    console.log("📥 [DIAGNOSTIC] Objet complet reçu de Supabase :", JSON.stringify(bodyData));
    
    const conversationId = bodyData?.conversation_id || bodyData?.record?.conversation_id || bodyData?.new?.conversation_id;
    const senderId = bodyData?.sender_id || bodyData?.record?.sender_id || bodyData?.new?.sender_id;
    const messageContent = bodyData?.content || bodyData?.record?.content || 'Vous avez reçu un nouveau message';

    if (!conversationId) {
      console.warn("⚠️ Webhook ignoré : Aucun champ conversation_id identifié.");
      return NextResponse.json({ success: true, message: 'Données manquantes' });
    }

    // 3. INITIALISATION DU CLIENT SUPABASE (PRODUIT EN DUR AVEC LA CLÉ PUBLIQUE SÉCURISÉE)
    const supabaseUrl = "https://supabase.co";
    const supabaseKey = "sb_publishable_IkgerRQwVuFEgUvTE6ezgA_UJxG3TDu74HRE_vVfFms="; 

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      db: { schema: 'public' }
    });

    // 4. RÉCUPÉRATION DE LA CONVERSATION
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error(`❌ Échec de lecture de la conversation ID ${conversationId} :`, convError?.message || JSON.stringify(convError));
      
      // Sécurité : Si Supabase renvoie du HTML à cause d'un micro-délai de cache, on évite le crash fatal
      return NextResponse.json({ success: true, warning: 'Lecture en attente d’authentification' });
    }

    // 5. RECHERCHE DU DESTINATAIRE CIBLE
    const recipientId = conversation.buyer_id === senderId ? conversation.seller_id : conversation.buyer_id;
    if (!recipientId) {
      return NextResponse.json({ success: true, message: 'Destinataire introuvable' });
    }

    console.log(`👤 Connexion établie ! Destinataire identifié : ${recipientId}`);

    // 6. SÉLECTION DU JETON DE NOTIFICATION PUSH
    const { data: subs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', recipientId);

    if (subError || !subs || subs.length === 0) {
      console.log(`ℹ️ Aucun terminal actif enregistré en base pour l'utilisateur ${recipientId}`);
      return NextResponse.json({ success: true, message: 'Aucun jeton push enregistré en base de données' });
    }

    const payload = JSON.stringify({
      title: 'Nouveau message sur TrocTruc SPM',
      body: messageContent,
      url: '/messages'
    });

    // 7. EXPÉDITION PARALLÈLE DES NOTIFICATIONS PUSH
    await Promise.all(
      subs.map(async (row) => {
        try {
          const subObj = typeof row.subscription === 'string' ? JSON.parse(row.subscription) : row.subscription;
          await webpush.sendNotification(subObj, payload);
          console.log(`✅ Notification push transmise avec succès au terminal ID : ${row.id}`);
        } catch (err: any) {
          console.error(`❌ Échec d'envoi web-push pour l'abonnement ${row.id} :`, err.message);
          // Nettoyage automatique des jetons expirés (Error 410 / 404)
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', row.id);
          }
        }
      })
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('💥 Erreur critique interceptée :', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
