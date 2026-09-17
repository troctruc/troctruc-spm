'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type TypeTrajet =
  | 'conducteur'
  | 'passager'

export default function NouveauCovoiturage() {
  const router = useRouter()

  const [user, setUser] =
    useState<any>(null)

  const [loading, setLoading] =
    useState(false)

  const [typeTrajet, setTypeTrajet] =
    useState<TypeTrajet>('conducteur')

  const [depart, setDepart] =
    useState('')

  const [arrivee, setArrivee] =
    useState('')

  const [dateTrajet, setDateTrajet] =
    useState('')

  const [heureTrajet, setHeureTrajet] =
    useState('')

  const [places, setPlaces] =
    useState('1')

  const [prix, setPrix] =
    useState('0')

  const [description, setDescription] =
    useState('')

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser()

      if (!user) {
        router.push('/auth')
        return
      }

      setUser(user)
    }

    getUser()
  }, [router])

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault()

    if (!user) {
      alert(
        'Vous devez être connecté.'
      )
      return
    }

    if (
      !depart.trim() ||
      !arrivee.trim()
    ) {
      alert(
        'Veuillez renseigner le départ et la destination.'
      )
      return
    }

    if (!dateTrajet) {
      alert(
        'Veuillez indiquer une date.'
      )
      return
    }

    const nombre =
      parseInt(places, 10)

    if (
      !nombre ||
      nombre < 1
    ) {
      alert(
        typeTrajet ===
          'conducteur'
          ? 'Indiquez le nombre de places disponibles.'
          : 'Indiquez le nombre de personnes à transporter.'
      )

      return
    }

    setLoading(true)

    const heurePourDate =
      heureTrajet || '12:00'

    const dateDepart =
      new Date(
        `${dateTrajet}T${heurePourDate}:00`
      ).toISOString()

    const {
      data,
      error,
    } =
      await supabase
        .from('covoiturages')
        .insert([
          {
            user_id:
              user.id,

            type:
              typeTrajet,

            lieu_depart:
              depart.trim(),

            lieu_arrivee:
              arrivee.trim(),

            date_depart:
              dateDepart,

            heure_indicative:
              heureTrajet ||
              null,

            places:
              nombre,

            prix:
              parseFloat(
                prix
              ) || 0,

            description:
              description.trim() ||
              null,

            status:
              'en attente',
          },
        ])
        .select()
        .single()

    if (error) {
      setLoading(false)

      console.error(
        'Erreur création covoiturage :',
        error
      )

      alert(
        'Erreur lors de la publication : ' +
          error.message
      )

      return
    }

    /*
     * NOTIFICATION ADMIN
     */
    try {
      const response =
        await fetch(
          '/api/notify-admin',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                notificationType:
                  'covoiturage',

                id:
                  data.id,

                typeTrajet,

                depart:
                  depart.trim(),

                arrivee:
                  arrivee.trim(),

                dateDepart,

                description:
                  description.trim(),

                user_id:
                  user.id,
              }),
          }
        )

      if (!response.ok) {
        console.error(
          'Notification admin non envoyée'
        )
      }
    } catch (err) {
      console.error(
        'Erreur notification admin :',
        err
      )
    }

    setLoading(false)

    alert(
      typeTrajet ===
        'conducteur'
        ? 'Votre trajet a été envoyé pour validation.'
        : 'Votre recherche de trajet a été envoyée pour validation.'
    )

    router.push(
      '/covoiturage'
    )

    router.refresh()
  }

  const isConducteur =
    typeTrajet ===
    'conducteur'

  return (
    <div
      style={{
        minHeight:
          '100vh',

        backgroundColor:
          '#f4f6f8',

        paddingBottom:
          '60px',

        fontFamily:
          'system-ui, -apple-system, sans-serif',
      }}
    >
      <header
        style={{
          backgroundColor:
            '#ffffff',

          borderBottom:
            '1px solid #e1e4e8',

          padding:
            '15px 30px',

          display:
            'flex',

          justifyContent:
            'space-between',

          alignItems:
            'center',
        }}
      >
        <div
          onClick={() =>
            router.push('/')
          }
          style={{
            display:
              'flex',

            alignItems:
              'center',

            gap:
              '12px',

            cursor:
              'pointer',
          }}
        >
          <img
            src="/puffin-logo.jpeg"
            alt="TrocTruc SPM"
            style={{
              width:
                '45px',

              height:
                '45px',

              objectFit:
                'contain',

              borderRadius:
                '8px',
            }}
          />

          <div>
            <h1
              style={{
                margin:
                  0,

                fontSize:
                  '18px',

                color:
                  '#2c3e50',
              }}
            >
              TrocTruc SPM
            </h1>

            <p
              style={{
                margin:
                  0,

                fontSize:
                  '11px',

                color:
                  '#7f8c8d',
              }}
            >
              Covoiturage
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push(
              '/covoiturage'
            )
          }
          style={{
            background:
              'none',

            border:
              '1px solid #cbd5e1',

            padding:
              '7px 12px',

            borderRadius:
              '6px',

            cursor:
              'pointer',
          }}
        >
          ← Retour
        </button>
      </header>

      <main
        style={{
          maxWidth:
            '720px',

          margin:
            '30px auto',

          padding:
            '0 20px',
        }}
      >
        <div
          style={{
            backgroundColor:
              '#ffffff',

            borderRadius:
              '12px',

            padding:
              '30px',

            border:
              '1px solid #e1e4e8',

            boxShadow:
              '0 2px 8px rgba(0,0,0,0.05)',
          }}
        >
          <h2
            style={{
              margin:
                '0 0 5px',

              color:
                '#2c3e50',
            }}
          >
            🚗 Covoiturage
          </h2>

          <p
            style={{
              color:
                '#64748b',

              fontSize:
                '14px',

              margin:
                '0 0 25px',
            }}
          >
            Proposez une place ou recherchez quelqu'un pour vous transporter.
          </p>

          <form
            onSubmit={
              handleSubmit
            }
            style={{
              display:
                'flex',

              flexDirection:
                'column',

              gap:
                '22px',
            }}
          >
            <div>
              <label
                style={{
                  ...labelStyle,

                  fontSize:
                    '15px',
                }}
              >
                Que souhaitez-vous publier ?
              </label>

              <div
                style={{
                  display:
                    'grid',

                  gridTemplateColumns:
                    '1fr 1fr',

                  gap:
                    '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setTypeTrajet(
                      'conducteur'
                    )
                  }
                  style={{
                    ...choiceStyle,

                    border:
                      isConducteur
                        ? '2px solid #356f63'
                        : '1px solid #cbd5e1',

                    backgroundColor:
                      isConducteur
                        ? '#edf4f1'
                        : '#fff',
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        '27px',
                    }}
                  >
                    🚗
                  </div>

                  <strong>
                    Je propose un trajet
                  </strong>

                  <small
                    style={{
                      color:
                        '#64748b',
                    }}
                  >
                    J'ai des places disponibles dans mon véhicule.
                  </small>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTypeTrajet(
                      'passager'
                    )
                  }
                  style={{
                    ...choiceStyle,

                    border:
                      !isConducteur
                        ? '2px solid #356f63'
                        : '1px solid #cbd5e1',

                    backgroundColor:
                      !isConducteur
                        ? '#edf4f1'
                        : '#fff',
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        '27px',
                    }}
                  >
                    🔎
                  </div>

                  <strong>
                    Je recherche un trajet
                  </strong>

                  <small
                    style={{
                      color:
                        '#64748b',
                    }}
                  >
                    Je cherche quelqu'un pouvant me transporter.
                  </small>
                </button>
              </div>
            </div>

            <div
              style={{
                display:
                  'grid',

                gridTemplateColumns:
                  '1fr 1fr',

                gap:
                  '15px',
              }}
            >
              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Lieu de départ
                </label>

                <input
                  value={
                    depart
                  }
                  onChange={(e) =>
                    setDepart(
                      e.target
                        .value
                    )
                  }
                  placeholder="Ex : Fortune"
                  required
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Destination
                </label>

                <input
                  value={
                    arrivee
                  }
                  onChange={(e) =>
                    setArrivee(
                      e.target
                        .value
                    )
                  }
                  placeholder="Ex : Saint John's"
                  required
                  style={
                    inputStyle
                  }
                />
              </div>
            </div>

            <div
              style={{
                display:
                  'grid',

                gridTemplateColumns:
                  '1fr 1fr',

                gap:
                  '15px',
              }}
            >
              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  {isConducteur
                    ? 'Date du trajet'
                    : 'Date recherchée'}
                </label>

                <input
                  type="date"
                  value={
                    dateTrajet
                  }
                  onChange={(e) =>
                    setDateTrajet(
                      e.target
                        .value
                    )
                  }
                  required
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  {isConducteur
                    ? 'Heure de départ'
                    : 'Heure souhaitée (facultative)'}
                </label>

                <input
                  type="time"
                  value={
                    heureTrajet
                  }
                  onChange={(e) =>
                    setHeureTrajet(
                      e.target
                        .value
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </div>
            </div>

            <div
              style={{
                display:
                  'grid',

                gridTemplateColumns:
                  '1fr 1fr',

                gap:
                  '15px',
              }}
            >
              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  {isConducteur
                    ? 'Nombre de places disponibles'
                    : 'Nombre de personnes à transporter'}
                </label>

                <input
                  type="number"
                  min="1"
                  max="8"
                  value={
                    places
                  }
                  onChange={(e) =>
                    setPlaces(
                      e.target
                        .value
                    )
                  }
                  required
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  {isConducteur
                    ? 'Participation par place (€)'
                    : 'Participation possible (€)'}
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    prix
                  }
                  onChange={(e) =>
                    setPrix(
                      e.target
                        .value
                    )
                  }
                  style={
                    inputStyle
                  }
                />

                <div
                  style={{
                    marginTop:
                      '4px',

                    fontSize:
                      '11px',

                    color:
                      '#94a3b8',
                  }}
                >
                  0 € = gratuit
                </div>
              </div>
            </div>

            <div>
              <label
                style={
                  labelStyle
                }
              >
                {isConducteur
                  ? 'Précisions sur le trajet'
                  : 'Précisions sur votre recherche'}
              </label>

              <textarea
                value={
                  description
                }
                onChange={(e) =>
                  setDescription(
                    e.target
                      .value
                  )
                }
                placeholder={
                  isConducteur
                    ? 'Point de rendez-vous, bagages, détour possible...'
                    : 'Expliquez votre besoin : enfants, bagages, horaires flexibles...'
                }
                rows={5}
                style={{
                  ...inputStyle,

                  resize:
                    'vertical',
                }}
              />
            </div>

            <div
              style={{
                backgroundColor:
                  '#f8fafc',

                border:
                  '1px solid #e2e8f0',

                padding:
                  '10px 12px',

                borderRadius:
                  '7px',

                fontSize:
                  '12px',

                color:
                  '#64748b',
              }}
            >
              💬 Les échanges avec les autres membres se feront directement via la messagerie TrocTruc.
            </div>

            <button
              type="submit"
              disabled={
                loading
              }
              style={{
                backgroundColor:
                  '#27ae60',

                color:
                  '#fff',

                border:
                  'none',

                padding:
                  '13px',

                borderRadius:
                  '7px',

                fontWeight:
                  'bold',

                cursor:
                  loading
                    ? 'wait'
                    : 'pointer',

                opacity:
                  loading
                    ? 0.7
                    : 1,
              }}
            >
              {loading
                ? 'Publication en cours...'
                : isConducteur
                  ? '🚗 Envoyer mon trajet pour validation'
                  : '🔎 Envoyer ma recherche pour validation'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

const labelStyle:
  React.CSSProperties = {
  display:
    'block',

  fontWeight:
    '600',

  fontSize:
    '14px',

  color:
    '#334155',

  marginBottom:
    '7px',
}

const inputStyle:
  React.CSSProperties = {
  width:
    '100%',

  padding:
    '10px 11px',

  borderRadius:
    '6px',

  border:
    '1px solid #cbd5e1',

  fontSize:
    '14px',

  backgroundColor:
    '#fff',

  boxSizing:
    'border-box',

  outline:
    'none',
}

const choiceStyle:
  React.CSSProperties = {
  padding:
    '16px',

  borderRadius:
    '10px',

  cursor:
    'pointer',

  display:
    'flex',

  flexDirection:
    'column',

  gap:
    '5px',

  textAlign:
    'left',

  color:
    '#24313f',
}