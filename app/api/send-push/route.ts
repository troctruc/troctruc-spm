import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:contact.troctruc@gmail.com';

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

export async function POST(request: Request) {
  try {
    const { userId, title, body, url } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 });
    }

    // Client Supabase côté serveur avec la clé service role ou clé anon
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer les abonnements de cet utilisateur
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', userId);

    if (error || !subs || subs.length === 0) {
      return NextResponse.json({ message: 'Aucun abonnement trouvé pour cet utilisateur' });
    }

    const payload = JSON.stringify({
      title: title || 'TrocTruc SPM',
      body: body || 'Vous avez une notification',
      url: url || '/'
    });

    const sendPromises = subs.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, payload);
      } catch (err: any) {
        // Si l'abonnement a expiré ou n'est plus valide, on le nettoie
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', row.id);
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Erreur push :', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}