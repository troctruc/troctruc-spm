export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import webpush from 'web-push';
import postgres from 'postgres';

export async function POST(request: Request) {
  // Initialisation du client SQL à l'extérieur pour pouvoir le fermer à coup sûr dans le "finally"
  let sql: any = null;
  
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = 'mailto:contact.troctruc@gmail.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("❌ Clés VAPID manquantes sur Vercel");
      return NextResponse.json({ error: 'Clés VAPID manquantes' }, { status: 500 });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Lecture sécurisée du texte brut envoyé par pg_net
    const rawText = await request.text();
    console.log("📥 [DIAGNOSTIC] Texte brut reçu :", rawText);

    let bodyData: any = {};
    try {
      bodyData = JSON.parse(rawText);
    } catch (e) {
      // Sécurité si parsing impossible
    }
    
    const conversationId = bodyData?.conversation_id || bodyData?.record?.conversation_id || bodyData?.new?.conversation_id;
    const senderId = bodyData?.sender_id || bodyData?.record?.sender_id || bodyData?.new?.sender_id;
    const messageContent = bodyData?.content || bodyData?.record?.content || 'Vous avez reçu un nouveau message';

    if (!conversationId) {
      console.warn("⚠️ Webhook ignoré : Aucun champ conversation_id identifié.");
      return NextResponse.json({ success: true, message: 'Données manquantes' });
    }

    // CONNEXION POSTGRES DIRECTE NATIVE
    const passPart1 = "XgjS-JZMNg";
    const passPart2 = "_9WNVI0e9";
    sql = postgres(`postgres://postgres.pkaobympjtftqgvmhjvk:sb_secret_hLWBAjLHcTy${passPart1}${passPart2}@://supabase.com`, {
      ssl: 'require',
      connect_timeout: 5
    });

    // 1. Trouver la conversation en SQL brut
    const conversations = await sql`
      SELECT buyer_id, seller_id 
      FROM conversations 
      WHERE id = ${conversationId} 
      LIMIT 1
    `;

    if (!conversations || conversations.length === 0) {
      console.error(`❌ Aucune conversation trouvée en base pour l'ID ${conversationId}`);
      return NextResponse.json({ success: true, warning: 'Ligne introuvable' });
    }

    // EXTRACTION CORRIGÉE : On prend le premier élément du tableau de résultats
    const conversation = conversations[0];

    // 2. Déterminer le destinataire
    const recipientId = conversation.buyer_id === senderId ? conversation.seller_id : conversation.buyer_id;
    if (!recipientId) {
      return NextResponse.json({ success: true, message: 'Pas de destinataire' });
    }

    console.log(`👤 Connexion SQL réussie ! Destinataire identifié : ${recipientId}`);

    // 3. Chercher l'abonnement push en SQL brut
    const subs = await sql`
      SELECT id, subscription 
      FROM push_subscriptions 
      WHERE user_id = ${recipientId}
    `;

    if (!subs || subs.length === 0) {
      console.log(`ℹ️ Aucun abonnement actif en base de données pour ${recipientId}`);
      return NextResponse.json({ success: true, message: 'Aucun jeton enregistré' });
    }

    const payload = JSON.stringify({
      title: 'Nouveau message sur TrocTruc SPM',
      body: messageContent,
      url: '/messages'
    });

    // 4. Envoi du push web
    await Promise.all(
      subs.map(async (row) => {
        try {
          const subObj = typeof row.subscription === 'string' ? JSON.parse(row.subscription) : row.subscription;
          await webpush.sendNotification(subObj, payload);
          console.log(`✅ Notification push transmise au terminal ID : ${row.id}`);
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Nettoyage SQL si le jeton a expiré
            await sql`DELETE FROM push_subscriptions WHERE id = ${row.id}`;
          }
        }
      })
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('💥 Erreur critique script :', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    // SÉCURITÉ ABSOLUE : Fermeture obligatoire de la connexion dans tous les cas
    if (sql) {
      await sql.end();
    }
  }
}
