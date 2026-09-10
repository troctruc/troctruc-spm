export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject =
      process.env.VAPID_SUBJECT ||
      'mailto:contact.troctruc@gmail.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('Clés VAPID manquantes');

      return NextResponse.json(
        { error: 'Clés VAPID manquantes' },
        { status: 500 }
      );
    }

    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    const bodyData = await request.json();

    const record =
      bodyData?.record ||
      bodyData?.new ||
      bodyData?.data ||
      bodyData;

    const conversationId =
      record?.conversation_id ||
      record?.conversation ||
      record?.conversationId;

    const senderId =
      record?.sender_id ||
      record?.sender ||
      record?.senderId;

    if (!conversationId || !senderId) {
      return NextResponse.json({
        success: true,
        message: 'conversationId ou senderId manquant',
      });
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Variables Supabase serveur manquantes' },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: conversation, error: convError } =
      await supabase
        .from('conversations')
        .select('buyer_id, seller_id')
        .eq('id', conversationId)
        .single();

    if (convError || !conversation) {
      console.error('Conversation introuvable', convError);

      return NextResponse.json({
        success: true,
        message: 'Conversation introuvable',
      });
    }

    let recipientId: string | null = null;

    if (senderId === conversation.buyer_id) {
      recipientId = conversation.seller_id;
    } else if (senderId === conversation.seller_id) {
      recipientId = conversation.buyer_id;
    } else {
      return NextResponse.json({
        success: true,
        message: 'Expéditeur incohérent',
      });
    }

    const { data: subs, error: subError } =
      await supabase
        .from('push_subscriptions')
        .select('id, subscription')
        .eq('user_id', recipientId);

    if (subError) {
      console.error('Erreur abonnements push', subError);

      return NextResponse.json(
        { error: 'Erreur abonnements push' },
        { status: 500 }
      );
    }

    if (!subs || subs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Aucun appareil abonné',
      });
    }

    const payload = JSON.stringify({
      title: 'TrocTruc SPM',
      body: 'Vous avez reçu un nouveau message',
      url: `/messages?conversation=${conversationId}`,
      conversationId,
    });

    await Promise.all(
      subs.map(async (row) => {
        try {
          const subscription =
            typeof row.subscription === 'string'
              ? JSON.parse(row.subscription)
              : row.subscription;

          await webpush.sendNotification(
            subscription,
            payload
          );
        } catch (err: any) {
          console.error(
            'Erreur push :',
            err?.message
          );

          if (
            err?.statusCode === 404 ||
            err?.statusCode === 410
          ) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', row.id);
          }
        }
      })
    );

    return NextResponse.json({
      success: true,
      recipientId,
      devices: subs.length,
    });
  } catch (err: any) {
    console.error('Erreur send-push :', err);

    return NextResponse.json(
      { error: err?.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}