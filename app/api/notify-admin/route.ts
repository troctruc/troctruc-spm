import nodemailer from 'nodemailer'

export async function POST(req: Request) {
  try {
    const body =
      await req.json()

    const annonce =
      body.record || body

    const notificationType =
      annonce.notificationType ||
      ''

    const isModification =
      annonce.type ===
      'modification'

    const isCovoiturage =
      notificationType ===
      'covoiturage'

    let subject = ''
    let title = ''
    let intro = ''
    let targetUrl = ''

    if (isCovoiturage) {
      const typeLabel =
        annonce.typeTrajet ===
        'conducteur'
          ? 'Proposition de trajet'
          : 'Recherche de trajet'

      subject =
        `Nouveau covoiturage à valider : ${annonce.depart} → ${annonce.arrivee}`

      title =
        'Un nouveau covoiturage attend votre validation !'

      intro =
        `${typeLabel} : ${annonce.depart} → ${annonce.arrivee}`

      targetUrl =
        'https://troctruc-spm.com/covoiturage'
    } else if (
      isModification
    ) {
      subject =
        `Annonce modifiée à revalider : ${
          annonce.titre ||
          'Sans titre'
        }`

      title =
        "Une annonce vient d'être modifiée !"

      intro =
        "Le propriétaire a modifié son annonce. Elle repasse en attente de validation."

      targetUrl =
        `https://troctruc-spm.com/annonces/${annonce.id}`
    } else {
      subject =
        `Nouvelle annonce à valider : ${
          annonce.titre ||
          'Sans titre'
        }`

      title =
        "Une nouvelle annonce vient d'être déposée !"

      intro =
        'Une nouvelle annonce attend votre validation.'

      targetUrl =
        `https://troctruc-spm.com/annonces/${annonce.id}`
    }

    if (
      !process.env.GMAIL_USER
    ) {
      throw new Error(
        'GMAIL_USER manquant.'
      )
    }

    if (
      !process.env
        .GMAIL_APP_PASS
    ) {
      throw new Error(
        'GMAIL_APP_PASS manquant.'
      )
    }

    const transporter =
      nodemailer.createTransport({
        service:
          'gmail',

        auth: {
          user:
            process.env
              .GMAIL_USER,

          pass:
            process.env
              .GMAIL_APP_PASS,
        },
      })

    await transporter.verify()

    let detailsHtml = ''

    if (isCovoiturage) {
      detailsHtml = `
        <p>
          <strong>Type :</strong>
          ${
            annonce.typeTrajet ===
            'conducteur'
              ? 'Proposition de trajet'
              : 'Recherche de trajet'
          }
        </p>

        <p>
          <strong>Trajet :</strong>
          ${annonce.depart || '?'}
          →
          ${annonce.arrivee || '?'}
        </p>

        ${
          annonce.description
            ? `
              <p>
                <strong>Précisions :</strong><br />
                ${annonce.description}
              </p>
            `
            : ''
        }
      `
    } else {
      detailsHtml = `
        <p>
          <strong>Titre :</strong>
          ${annonce.titre || 'Sans titre'}
        </p>

        <p>
          <strong>Catégorie :</strong>
          ${annonce.categorie || 'Non renseignée'}
        </p>

        <p>
          <strong>Prix :</strong>
          ${
            annonce.prix !==
              undefined &&
            annonce.prix !==
              null
              ? `${annonce.prix} €`
              : 'Non précisé'
          }
        </p>
      `
    }

    const info =
      await transporter.sendMail({
        from:
          `"TrocTruc SPM" <${process.env.GMAIL_USER}>`,

        to:
          process.env
            .GMAIL_USER,

        subject,

        html: `
          <div
            style="
              font-family: sans-serif;
              padding: 20px;
              color: #2c3e50;
            "
          >
            <h2>
              ${title}
            </h2>

            <p>
              ${intro}
            </p>

            ${detailsHtml}

            <br />

            <a
              href="${targetUrl}"
              style="
                background-color: #2ecc71;
                color: white;
                padding: 10px 18px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                display: inline-block;
              "
            >
              Voir et valider
            </a>
          </div>
        `,
      })

    return Response.json({
      success:
        true,

      messageId:
        info.messageId,
    })
  } catch (err: any) {
    console.error(
      'Erreur envoi notification mail :',
      err
    )

    return Response.json(
      {
        success:
          false,

        error:
          err?.message ||
          'Erreur inconnue',
      },
      {
        status:
          500,
      }
    )
  }
}