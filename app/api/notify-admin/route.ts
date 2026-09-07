import nodemailer from 'nodemailer'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const annonce = body.record || body

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
    })

    await transporter.sendMail({
      from: `"TrocTruc SPM" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `Nouvelle annonce à valider : ${annonce.titre || 'Sans titre'}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #2c3e50;">
          <h2>Une nouvelle annonce vient d'être déposée !</h2>
          <p><strong>Titre :</strong> ${annonce.titre || 'Sans titre'}</p>
          <p><strong>Catégorie :</strong> ${annonce.categorie || 'Non renseignée'}</p>
          <p><strong>Prix :</strong> ${annonce.prix !== undefined ? `${annonce.prix} €` : 'Non précisé'}</p>
          <br />
          <a href="https://troctruc-spm.com/annonces/${annonce.id}" 
             style="background-color: #2ecc71; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Voir l'annonce et la valider
          </a>
        </div>
      `,
    })

    return Response.json({ success: true })
  } catch (err: any) {
    console.error("Erreur envoi notification mail :", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}