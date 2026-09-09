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
    
    if (bodyData.type !== 'INSERT' || !bodyData.record) {
      return NextResponse.json({ success: true, message: 'Non concerné' });
    }

    const record = bodyData.record;
    const senderId = record.sender_id;
    const conversationId = record.conversation_id;
    const messageContent = record.content || 'Vous avez reçu un nouveau message';

    if (!conversationId || !senderId) {
      return NextResponse.json({ success: true, warning: 'Conversation ou émetteur manquant' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Trouver les participants de la conversation pour identifier le destinataire (celui qui n'est pas l'émetteur)
    // Adaptez le nom de la table de liaison si elle s'appelle différemment (ex: conversation_participants ou conversations)
    const { data: participants, error: partError } = await supabase
      .from('conversation_participants') // ou 'conversations' selon votre structure
      .select('user_id')
      .eq('conversation_id', conversationId);

    if (partError || !participants) {
      console.error('Erreur récupération participants :', partError);
      return NextResponse.json({ success: true, warning: 'Impossible de trouver les participants' });
    }

    // Le destinataire est le participant dont l'ID est différent de l'émetteur du message
    const recipient = participants.find((p: any) => p.user_id !== senderId);

    if (!recipient) {
      return NextResponse.json({ success: true, message: 'Aucun destinataire tiers trouvé' });
    }

    const recipientId = recipient.user_id;

    // 2. Récupérer l'abonnement push du destinataire
    const { data: subs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', recipientId);

    if (subError || !subs || subs.length === 0) {
      return NextResponse.json({ success: true, message: 'Aucun abonnement push pour le destinataire' });
    }

    const payload = JSON.stringify({
      title: 'Nouveau message sur TrocTruc SPM',
      body: messageContent,
      url: '/messages'
    });

    await Promise.all(
      subs.map(async (row) => {
        try {
          await webpush.sendNotification(row.subscription, payload);
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', row.id);
          }
        }
      })
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Erreur push :', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}