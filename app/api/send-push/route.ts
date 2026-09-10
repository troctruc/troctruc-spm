export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const vapidPublicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    const vapidPrivateKey =
      process.env.VAPID_PRIVATE_KEY;

    const vapidSubject =
      process.env.VAPID_SUBJECT ||
      'mailto:contact.troctruc@gmail.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('❌ Clés VAPID manquantes');

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

    console.log(
      '📥 send-push reçu :',
      JSON.stringify(bodyData)
    );

    let record =
      bodyData?.record ||
      bodyData?.new ||
      bodyData?.data ||
      bodyData;

    if (typeof record === 'string') {
      try {
        record = JSON.parse(record);
      } catch {
        console.error(
          '❌ Impossible de convertir record en JSON'
        );
      }
    }

    const conversationId =
      record?.conversation_id ||
      record?.conversation ||
      record?.conversationId;

    const senderId =
      record?.sender_id ||
      record?.sender ||
      record?.senderId;

    if (!conversationId || !senderId) {
      console.error(
        '❌ conversationId ou senderId manquant',
        {
          conversationId,
          senderId,
          record
        }
      );

      return NextResponse.json({
        success: false,
        message:
          'conversationId ou senderId manquant'
      });
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error(
        '❌ Variables Supabase serveur manquantes'
      );

      return NextResponse.json(
        {
          error:
            'Variables Supabase serveur manquantes'
        },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Récupération de la conversation
    const {
      data: conversation,
      error: convError
    } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error(
        '❌ Conversation introuvable',
        {
          conversationId,
          convError
        }
      );

      return NextResponse.json({
        success: false,
        message: 'Conversation introuvable'
      });
    }

    console.log(
      '💬 Conversation trouvée :',
      conversation
    );

    // Détermination du destinataire
    let recipientId: string | null = null;

    if (senderId === conversation.buyer_id) {
      recipientId = conversation.seller_id;
    } else if (
      senderId === conversation.seller_id
    ) {
      recipientId = conversation.buyer_id;
    } else {
      console.error(
        '❌ Expéditeur absent de la conversation',
        {
          senderId,
          buyer: conversation.buyer_id,
          seller: conversation.seller_id
        }
      );

      return NextResponse.json({
        success: false,
        message: 'Expéditeur incohérent'
      });
    }

    if (!recipientId) {
      console.error(
        '❌ Aucun destinataire trouvé'
      );

      return NextResponse.json({
        success: false,
        message: 'Destinataire introuvable'
      });
    }

    console.log(
      '👤 Destinataire :',
      recipientId
    );

    // Récupération des appareils du destinataire
    const {
      data: subs,
      error: subError
    } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', recipientId);

    if (subError) {
      console.error(
        '❌ Erreur lecture push_subscriptions',
        subError
      );

      return NextResponse.json(
        {
          error:
            'Erreur abonnements push'
        },
        { status: 500 }
      );
    }

    if (!subs || subs.length === 0) {
      console.log(
        `ℹ️ Aucun appareil abonné pour ${recipientId}`
      );

      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        message: 'Aucun appareil abonné'
      });
    }

    console.log(
      `📱 ${subs.length} abonnement(s) push trouvé(s)`
    );

    const payload = JSON.stringify({
      title: 'TrocTruc SPM',
      body:
        'Vous avez reçu un nouveau message',
      url: '/conversations',
      conversationId
    });

    let sent = 0;
    let failed = 0;

    await Promise.all(
      subs.map(async (row) => {
        const subscription =
          typeof row.subscription === 'string'
            ? JSON.parse(row.subscription)
            : row.subscription;

        try {
          const result =
            await webpush.sendNotification(
              subscription,
              payload
            );

          sent++;

          console.log(
            '✅ PUSH ENVOYÉ',
            {
              subscriptionId: row.id,
              statusCode:
                result?.statusCode,
              endpoint:
                subscription?.endpoint
            }
          );
        } catch (err: any) {
          failed++;

          console.error(
            '❌ ERREUR PUSH COMPLETE',
            {
              subscriptionId:
                row.id,
              message:
                err?.message,
              statusCode:
                err?.statusCode,
              body:
                err?.body,
              headers:
                err?.headers,
              endpoint:
                subscription?.endpoint
            }
          );

          // Abonnement devenu invalide
          if (
            err?.statusCode === 404 ||
            err?.statusCode === 410
          ) {
            console.log(
              '🗑️ Suppression abonnement invalide :',
              row.id
            );

            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', row.id);
          }
        }
      })
    );

    console.log(
      '📊 Résultat push :',
      {
        recipientId,
        devices: subs.length,
        sent,
        failed
      }
    );

    return NextResponse.json({
      success: sent > 0,
      recipientId,
      devices: subs.length,
      sent,
      failed
    });
  } catch (err: any) {
    console.error(
      '💥 ERREUR CRITIQUE send-push',
      {
        message: err?.message,
        stack: err?.stack
      }
    );

    return NextResponse.json(
      {
        error:
          err?.message ||
          'Erreur serveur'
      },
      { status: 500 }
    );
  }
}