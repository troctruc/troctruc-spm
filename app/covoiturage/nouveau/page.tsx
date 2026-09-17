'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type TypeTrajet = 'conducteur' | 'passager'

export default function NouveauCovoiturage() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const [typeTrajet, setTypeTrajet] =
    useState<TypeTrajet>('conducteur')

  const [depart, setDepart] = useState('')
  const [arrivee, setArrivee] = useState('')
  const [dateTrajet, setDateTrajet] = useState('')
  const [heureTrajet, setHeureTrajet] = useState('')

  const [places, setPlaces] = useState('1')
  const [prix, setPrix] = useState('0')

  const [contact, setContact] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth')
        return
      }

      setUser(user)
    }

    getUser()
  }, [router])

  function handleTypeChange(type: TypeTrajet) {
    setTypeTrajet(type)

    if (type === 'conducteur') {
      setPlaces('1')
    } else {
      setPlaces('1')
    }
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault()

    if (!user) {
      alert(
        'Vous devez être connecté pour publier un covoiturage.'
      )
      return
    }

    if (
      !depart.trim() ||
      !arrivee.trim()
    ) {
      alert(
        "Veuillez renseigner le lieu de départ et la destination."
      )
      return
    }

    if (!dateTrajet) {
      alert(
        'Veuillez indiquer la date souhaitée.'
      )
      return
    }

    const nombrePlaces =
      parseInt(places, 10)

    if (
      !nombrePlaces ||
      nombrePlaces < 1
    ) {
      alert(
        typeTrajet === 'conducteur'
          ? 'Veuillez indiquer le nombre de places disponibles.'
          : 'Veuillez indiquer le nombre de personnes à transporter.'
      )

      return
    }

    setLoading(true)

    /*
     * La colonne date_depart est un timestamptz.
     *
     * On crée donc une vraie date/heure.
     * Si aucune heure n'est renseignée :
     * midi évite les problèmes de changement
     * de jour liés aux fuseaux horaires.
     */
    const heurePourDate =
      heureTrajet || '12:00'

    const dateDepart =
      new Date(
        `${dateTrajet}T${heurePourDate}:00`
      ).toISOString()

    const { error } = await supabase
      .from('covoiturages')
      .insert([
        {
          user_id: user.id,

          type: typeTrajet,

          lieu_depart:
            depart.trim(),

          lieu_arrivee:
            arrivee.trim(),

          date_depart:
            dateDepart,

          heure_indicative:
            heureTrajet || null,

          places:
            nombrePlaces,

          prix:
            parseFloat(prix) || 0,

          contact:
            contact.trim() || '',

          description:
            description.trim() || null,

          status:
            'validé',
        },
      ])

    setLoading(false)

    if (error) {
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

    alert(
      typeTrajet === 'conducteur'
        ? 'Votre proposition de trajet a été publiée !'
        : 'Votre recherche de trajet a été publiée !'
    )

    router.push('/covoiturage')
    router.refresh()
  }

  const isConducteur =
    typeTrajet === 'conducteur'

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f4f6f8',
        paddingBottom: '60px',
        fontFamily:
          'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* HEADER */}

      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom:
            '1px solid #e1e4e8',
          padding: '15px 30px',
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
        }}
      >
        <div
          onClick={() =>
            router.push('/')
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
          }}
        >
          <img
            src="/puffin-logo.jpeg"
            alt="Logo TrocTruc SPM"
            style={{
              width: '45px',
              height: '45px',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
          />

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '18px',
                color: '#2c3e50',
                fontWeight: 'bold',
              }}
            >
              TrocTruc SPM
            </h1>

            <p
              style={{
                margin: 0,
                fontSize: '11px',
                color: '#7f8c8d',
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
            background: 'none',
            border:
              '1px solid #cbd5e1',
            padding: '7px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#475569',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          ← Retour
        </button>
      </header>

      <main
        style={{
          maxWidth: '720px',
          margin: '30px auto',
          padding: '0 20px',
        }}
      >
        <div
          style={{
            backgroundColor:
              '#ffffff',
            borderRadius: '12px',
            padding: '30px',
            boxShadow:
              '0 2px 8px rgba(0,0,0,0.05)',
            border:
              '1px solid #e1e4e8',
          }}
        >
          <h2
            style={{
              margin:
                '0 0 6px',
              fontSize: '22px',
              color: '#2c3e50',
            }}
          >
            🚗 Covoiturage
          </h2>

          <p
            style={{
              margin:
                '0 0 25px',
              color: '#64748b',
              fontSize: '14px',
            }}
          >
            Proposez une place dans votre véhicule ou recherchez quelqu'un pour vous transporter.
          </p>

          <form
            onSubmit={
              handleSubmit
            }
            style={{
              display: 'flex',
              flexDirection:
                'column',
              gap: '22px',
            }}
          >
            {/* CHOIX PRINCIPAL */}

            <div>
              <label
                style={{
                  display: 'block',
                  fontWeight: '700',
                  fontSize: '15px',
                  color: '#334155',
                  marginBottom: '10px',
                }}
              >
                Que souhaitez-vous publier ?
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '1fr 1fr',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    handleTypeChange(
                      'conducteur'
                    )
                  }
                  style={{
                    padding: '18px',
                    textAlign: 'left',
                    borderRadius:
                      '10px',
                    border:
                      isConducteur
                        ? '2px solid #356f63'
                        : '1px solid #cbd5e1',
                    backgroundColor:
                      isConducteur
                        ? '#edf4f1'
                        : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      fontSize: '25px',
                      marginBottom:
                        '6px',
                    }}
                  >
                    🚗
                  </div>

                  <div
                    style={{
                      fontWeight:
                        '700',
                      color:
                        '#24313f',
                      marginBottom:
                        '4px',
                    }}
                  >
                    Je propose un trajet
                  </div>

                  <div
                    style={{
                      fontSize:
                        '12px',
                      color:
                        '#64748b',
                      lineHeight:
                        '1.4',
                    }}
                  >
                    J'ai une voiture et des places disponibles.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleTypeChange(
                      'passager'
                    )
                  }
                  style={{
                    padding: '18px',
                    textAlign: 'left',
                    borderRadius:
                      '10px',
                    border:
                      !isConducteur
                        ? '2px solid #356f63'
                        : '1px solid #cbd5e1',
                    backgroundColor:
                      !isConducteur
                        ? '#edf4f1'
                        : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      fontSize: '25px',
                      marginBottom:
                        '6px',
                    }}
                  >
                    🔎
                  </div>

                  <div
                    style={{
                      fontWeight:
                        '700',
                      color:
                        '#24313f',
                      marginBottom:
                        '4px',
                    }}
                  >
                    Je recherche un trajet
                  </div>

                  <div
                    style={{
                      fontSize:
                        '12px',
                      color:
                        '#64748b',
                      lineHeight:
                        '1.4',
                    }}
                  >
                    Je cherche quelqu'un pouvant me transporter.
                  </div>
                </button>
              </div>
            </div>

            {/* MESSAGE TYPE */}

            <div
              style={{
                backgroundColor:
                  isConducteur
                    ? '#f0fdf4'
                    : '#eff6ff',
                border:
                  isConducteur
                    ? '1px solid #bbf7d0'
                    : '1px solid #bfdbfe',
                color:
                  isConducteur
                    ? '#166534'
                    : '#1e40af',
                padding:
                  '11px 13px',
                borderRadius:
                  '8px',
                fontSize:
                  '13px',
              }}
            >
              {isConducteur
                ? '🚗 Vous publiez une proposition de covoiturage.'
                : '🔎 Vous publiez une recherche de covoiturage.'}
            </div>

            {/* DÉPART / ARRIVÉE */}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '1fr 1fr',
                gap: '15px',
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
                  type="text"
                  placeholder="Ex : Fortune, Saint-Pierre..."
                  value={depart}
                  onChange={(e) =>
                    setDepart(
                      e.target.value
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
                  Destination
                </label>

                <input
                  type="text"
                  placeholder="Ex : Saint John's, Miquelon..."
                  value={arrivee}
                  onChange={(e) =>
                    setArrivee(
                      e.target.value
                    )
                  }
                  required
                  style={
                    inputStyle
                  }
                />
              </div>
            </div>

            {/* DATE HEURE */}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '1fr 1fr',
                gap: '15px',
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
                      e.target.value
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
                      e.target.value
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </div>
            </div>

            {/* PERSONNES / PRIX */}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '1fr 1fr',
                gap: '15px',
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
                  value={places}
                  onChange={(e) =>
                    setPlaces(
                      e.target.value
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
                  value={prix}
                  onChange={(e) =>
                    setPrix(
                      e.target.value
                    )
                  }
                  style={
                    inputStyle
                  }
                />

                <div
                  style={{
                    marginTop:
                      '5px',
                    color:
                      '#94a3b8',
                    fontSize:
                      '11px',
                  }}
                >
                  0 € = gratuit
                </div>
              </div>
            </div>

            {/* CONTACT */}

            <div>
              <label
                style={
                  labelStyle
                }
              >
                Contact
              </label>

              <input
                type="text"
                placeholder="Téléphone ou autre moyen de contact"
                value={contact}
                onChange={(e) =>
                  setContact(
                    e.target.value
                  )
                }
                required
                style={
                  inputStyle
                }
              />
            </div>

            {/* DESCRIPTION */}

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
                placeholder={
                  isConducteur
                    ? 'Point de rendez-vous, bagages possibles, détour éventuel...'
                    : 'Expliquez votre besoin : flexibilité sur l’heure, enfants, bagages, destination précise...'
                }
                value={
                  description
                }
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                rows={5}
                style={{
                  ...inputStyle,
                  resize:
                    'vertical',
                }}
              />
            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={
                loading
              }
              style={{
                backgroundColor:
                  '#27ae60',
                color:
                  'white',
                border: 'none',
                padding:
                  '13px',
                borderRadius:
                  '7px',
                fontSize:
                  '15px',
                fontWeight:
                  'bold',
                cursor:
                  loading
                    ? 'wait'
                    : 'pointer',
                marginTop:
                  '4px',
                opacity:
                  loading
                    ? 0.7
                    : 1,
              }}
            >
              {loading
                ? 'Publication en cours...'
                : isConducteur
                  ? '🚗 Publier mon trajet'
                  : '🔎 Publier ma recherche'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: '600',
  fontSize: '14px',
  color: '#334155',
  marginBottom: '7px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 11px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
  outline: 'none',
  backgroundColor: '#ffffff',
  boxSizing: 'border-box',
}