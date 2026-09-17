'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Annonce = {
  id: string
  titre: string
  description: string | null
  prix: number | null
  categorie: string | null
  photos: string[] | null
  status: string | null
  user_id: string
}

export default function MesAnnoncesPage() {
  const router = useRouter()

  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    loadAnnonces()
  }, [])

  async function loadAnnonces() {
    setLoading(true)
    setErrorMsg('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      router.push('/auth')
      return
    }

    const { data, error } = await supabase
      .from('annonces')
      .select(
        'id, titre, description, prix, categorie, photos, status, user_id'
      )
      .eq('user_id', user.id)

    if (error) {
      console.error(error)

      setErrorMsg(
        "Impossible de récupérer vos annonces : " +
          error.message
      )

      setLoading(false)
      return
    }

    setAnnonces(data || [])
    setLoading(false)
  }

  async function handleDelete(annonce: Annonce) {
    const confirmation = window.confirm(
      `Voulez-vous vraiment supprimer l'annonce « ${annonce.titre} » ?\n\nCette action est définitive.`
    )

    if (!confirmation) {
      return
    }

    setDeletingId(annonce.id)
    setErrorMsg('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setDeletingId(null)
      router.push('/auth')
      return
    }

    const { error } = await supabase
      .from('annonces')
      .delete()
      .eq('id', annonce.id)
      .eq('user_id', user.id)

    if (error) {
      console.error(error)

      setErrorMsg(
        "Impossible de supprimer l'annonce : " +
          error.message
      )

      setDeletingId(null)
      return
    }

    setAnnonces((current) =>
      current.filter(
        (item) => item.id !== annonce.id
      )
    )

    setDeletingId(null)
  }

  function getStatusStyle(status: string | null) {
    switch (status) {
      case 'validé':
      case 'validée':
      case 'valide':
      case 'validee':
      case 'publiée':
      case 'publiee':
        return {
          backgroundColor: '#dcfce7',
          color: '#166534',
          label: 'Publiée',
        }

      case 'refusée':
      case 'refusee':
        return {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          label: 'Refusée',
        }

      case 'en attente':
      default:
        return {
          backgroundColor: '#fef3c7',
          color: '#92400e',
          label: 'En attente',
        }
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          backgroundColor: '#f4f6f8',
        }}
      >
        Chargement de vos annonces...
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f4f6f8',
        paddingBottom: '60px',
        fontFamily: 'sans-serif',
      }}
    >
      {/* HEADER */}
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e1e4e8',
          padding: '15px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div
          onClick={() => router.push('/')}
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
              Mes annonces
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push('/profil')}
          style={{
            background: 'none',
            border: '1px solid #cbd5e1',
            padding: '7px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#475569',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          ← Mon profil
        </button>
      </header>

      <main
        style={{
          maxWidth: '850px',
          margin: '30px auto',
          padding: '0 20px',
        }}
      >
        {/* TITRE */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '25px',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: '#2c3e50',
                fontSize: '24px',
              }}
            >
              📦 Mes annonces
            </h2>

            <p
              style={{
                color: '#64748b',
                fontSize: '14px',
                margin: '6px 0 0',
              }}
            >
              Retrouvez ici toutes les annonces que vous avez déposées.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push('/annonces/nouvelle')
            }
            style={{
              backgroundColor: '#27ae60',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '11px 16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            + Déposer une annonce
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              padding: '12px 15px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* AUCUNE ANNONCE */}
        {annonces.length === 0 ? (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '45px 25px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '48px',
                marginBottom: '12px',
              }}
            >
              📦
            </div>

            <h3
              style={{
                margin: '0 0 8px',
                color: '#334155',
              }}
            >
              Vous n'avez pas encore d'annonce
            </h3>

            <p
              style={{
                color: '#64748b',
                fontSize: '14px',
                marginBottom: '20px',
              }}
            >
              Déposez votre première annonce sur TrocTruc SPM.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push('/annonces/nouvelle')
              }
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '7px',
                padding: '11px 18px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Déposer une annonce
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '15px',
            }}
          >
            {annonces.map((annonce) => {
              const status =
                getStatusStyle(annonce.status)

              const photo =
                annonce.photos &&
                annonce.photos.length > 0
                  ? annonce.photos[0]
                  : null

              return (
                <div
                  key={annonce.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '15px',
                    display: 'flex',
                    gap: '18px',
                    alignItems: 'center',
                    boxShadow:
                      '0 2px 6px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* PHOTO */}
                  <div
                    style={{
                      width: '115px',
                      height: '100px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#f1f5f9',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {photo ? (
                      <img
                        src={photo}
                        alt={annonce.titre}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: '32px',
                        }}
                      >
                        📦
                      </span>
                    )}
                  </div>

                  {/* INFOS */}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                        marginBottom: '5px',
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: '17px',
                          color: '#1e293b',
                        }}
                      >
                        {annonce.titre}
                      </h3>

                      <span
                        style={{
                          backgroundColor:
                            status.backgroundColor,
                          color: status.color,
                          padding: '4px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: '700',
                        }}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '13px',
                        color: '#64748b',
                        marginBottom: '7px',
                      }}
                    >
                      {annonce.categorie ||
                        'Sans catégorie'}
                    </div>

                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#0f172a',
                      }}
                    >
                      {annonce.prix !== null &&
                      annonce.prix !== undefined
                        ? `${annonce.prix} €`
                        : ''}
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '7px',
                      minWidth: '115px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/annonces/${annonce.id}`
                        )
                      }
                      style={{
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                      }}
                    >
                      Voir
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/annonces/${annonce.id}/modifier`
                        )
                      }
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#475569',
                        border:
                          '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                      }}
                    >
                      Modifier
                    </button>

                    <button
                      type="button"
                      disabled={
                        deletingId === annonce.id
                      }
                      onClick={() =>
                        handleDelete(annonce)
                      }
                      style={{
                        backgroundColor: '#fff1f2',
                        color: '#be123c',
                        border:
                          '1px solid #fecdd3',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        cursor:
                          deletingId === annonce.id
                            ? 'wait'
                            : 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                        opacity:
                          deletingId === annonce.id
                            ? 0.6
                            : 1,
                      }}
                    >
                      {deletingId === annonce.id
                        ? 'Suppression...'
                        : 'Supprimer'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}