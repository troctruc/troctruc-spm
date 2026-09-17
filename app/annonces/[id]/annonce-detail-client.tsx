'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ChatModal from '@/components/ChatModal'

type AnnonceDetailClientProps = {
  initialAnnonce: any
}

export default function AnnonceDetailPage({
  initialAnnonce,
}: AnnonceDetailClientProps) {
  const router = useRouter()

  const [annonce, setAnnonce] = useState<any>(initialAnnonce)
  const [authorProfile, setAuthorProfile] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showChat, setShowChat] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setCurrentUser(user)

      const sellerId =
        initialAnnonce.user_id ||
        initialAnnonce.author_id ||
        initialAnnonce.created_by

      if (sellerId) {
        const { data: pData } = await supabase
          .from('profiles')
          .select('id, pseudo, avatar_url, bio')
          .eq('id', sellerId)
          .maybeSingle()

        if (pData) {
          setAuthorProfile(pData)
        }
      }
    }

    init()
  }, [initialAnnonce])

  async function handleValidateAnnonce() {
    const { error } = await supabase
      .from('annonces')
      .update({
        validated: true,
        status: 'validé',
      })
      .eq('id', annonce.id)

    if (error) {
      alert(
        'Erreur lors de la validation : ' +
          error.message
      )
      return
    }

    alert('Annonce validée avec succès !')

    setAnnonce((prev: any) => ({
      ...prev,
      validated: true,
      status: 'validé',
    }))
  }

  async function handleDeleteOwnAnnonce() {
    if (!currentUser) {
      router.push('/auth')
      return
    }

    const ownerId =
      annonce.user_id ||
      annonce.author_id ||
      annonce.created_by

    if (currentUser.id !== ownerId) {
      alert(
        'Vous ne pouvez supprimer que vos propres annonces.'
      )
      return
    }

    const confirmation = window.confirm(
      `Voulez-vous vraiment supprimer l'annonce « ${
        annonce.titre ||
        annonce.title ||
        'cette annonce'
      } » ?\n\nCette action est définitive.`
    )

    if (!confirmation) return

    setDeleting(true)

    const { error } = await supabase
      .from('annonces')
      .delete()
      .eq('id', annonce.id)
      .eq('user_id', currentUser.id)

    setDeleting(false)

    if (error) {
      alert(
        "Impossible de supprimer l'annonce : " +
          error.message
      )
      return
    }

    router.push('/mes-annonces')
    router.refresh()
  }

  const sellerId =
    annonce.user_id ||
    annonce.author_id ||
    annonce.created_by

  const isOwner =
    !!currentUser &&
    !!sellerId &&
    currentUser.id === sellerId

  let rawImages =
    annonce.photos ||
    annonce.image_url ||
    annonce.image_urls ||
    annonce.image ||
    annonce.photo ||
    []

  let rawList: string[] = []

  if (Array.isArray(rawImages)) {
    rawList = rawImages
  } else if (typeof rawImages === 'string') {
    rawList = rawImages
      .split(',')
      .map((url: string) => url.trim())
      .filter(Boolean)
  }

  const imagesList = rawList
    .map((item) => {
      if (!item) return ''

      if (
        item.startsWith('http') ||
        item.startsWith('data:image')
      ) {
        return item
      }

      const { data } = supabase.storage
        .from('annonces-images')
        .getPublicUrl(item)

      return data.publicUrl
    })
    .filter(Boolean)

  const handlePrevImage = () => {
    if (imagesList.length === 0) return

    setSelectedImageIndex((prev) =>
      prev === 0
        ? imagesList.length - 1
        : prev - 1
    )
  }

  const handleNextImage = () => {
    if (imagesList.length === 0) return

    setSelectedImageIndex((prev) =>
      prev === imagesList.length - 1
        ? 0
        : prev + 1
    )
  }

  const annonceTitle =
    annonce.titre ||
    annonce.title ||
    'Annonce sans titre'

  const annoncePrice =
    annonce.prix !== undefined &&
    annonce.prix !== null
      ? `${annonce.prix} €`
      : ''

  const annonceDesc =
    annonce.description ||
    'Aucune description fournie.'

  const annonceCat =
    annonce.categorie ||
    annonce.category ||
    'Autre'

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f4f6f8',
        padding: '40px 20px',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        {/* EN-TÊTE */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            gap: '15px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
            }}
          >
            <img
              src="/puffin-logo.jpeg"
              alt="TrocTruc SPM"
              style={{
                height: '45px',
                width: 'auto',
                borderRadius: '8px',
                objectFit: 'contain',
              }}
            />

            <button
              type="button"
              onClick={() => router.push('/')}
              style={{
                padding: '8px 15px',
                cursor: 'pointer',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#fff',
                fontWeight: '500',
              }}
            >
              ← Retour à l'accueil
            </button>
          </div>

          {currentUser &&
            !annonce.validated &&
            annonce.status !== 'validé' && (
              <button
                type="button"
                onClick={handleValidateAnnonce}
                style={{
                  padding: '8px 15px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#2ecc71',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              >
                ✅ Valider cette annonce
              </button>
            )}
        </div>

        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow:
              '0 4px 12px rgba(0,0,0,0.05)',
            border: '1px solid #e1e4e8',
          }}
        >
          {/* PHOTOS */}
          {imagesList.length > 0 ? (
            <div
              style={{
                padding: '20px',
                backgroundColor: '#1e293b',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '400px',
                  backgroundColor: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  borderRadius: '8px',
                }}
              >
                <img
                  src={imagesList[selectedImageIndex]}
                  alt={annonceTitle}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />

                {imagesList.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevImage}
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        backgroundColor:
                          'rgba(0,0,0,0.5)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        cursor: 'pointer',
                        fontSize: '18px',
                      }}
                    >
                      ❮
                    </button>

                    <button
                      type="button"
                      onClick={handleNextImage}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        backgroundColor:
                          'rgba(0,0,0,0.5)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        cursor: 'pointer',
                        fontSize: '18px',
                      }}
                    >
                      ❯
                    </button>

                    <div
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        backgroundColor:
                          'rgba(0,0,0,0.6)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {selectedImageIndex + 1} /{' '}
                      {imagesList.length}
                    </div>
                  </>
                )}
              </div>

              {/* MINIATURES */}
              {imagesList.length > 1 && (
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    overflowX: 'auto',
                    marginTop: '15px',
                    paddingBottom: '5px',
                  }}
                >
                  {imagesList.map((url, index) => (
                    <div
                      key={index}
                      onClick={() =>
                        setSelectedImageIndex(index)
                      }
                      style={{
                        minWidth: '70px',
                        width: '70px',
                        height: '70px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border:
                          selectedImageIndex === index
                            ? '2px solid #2ecc71'
                            : '1px solid #475569',
                        backgroundColor: '#0f172a',
                        cursor: 'pointer',
                        opacity:
                          selectedImageIndex === index
                            ? 1
                            : 0.6,
                      }}
                    >
                      <img
                        src={url}
                        alt={`${annonceTitle} - photo ${
                          index + 1
                        }`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                height: '300px',
                backgroundColor: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontSize: '15px',
              }}
            >
              Aucune photo disponible pour cette
              annonce
            </div>
          )}

          {/* CONTENU */}
          <div
            style={{
              padding: '30px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '15px',
                gap: '20px',
              }}
            >
              <div>
                <span
                  style={{
                    backgroundColor: '#e2e8f0',
                    color: '#475569',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'inline-block',
                    marginBottom: '10px',
                  }}
                >
                  {annonceCat}
                </span>

                <h1
                  style={{
                    fontSize: '24px',
                    color: '#2c3e50',
                    margin: '0 0 10px 0',
                  }}
                >
                  {annonceTitle}
                </h1>

                {(annonce.validated ||
                  annonce.status === 'validé') && (
                  <span
                    style={{
                      color: '#27ae60',
                      fontSize: '13px',
                      fontWeight: 'bold',
                    }}
                  >
                    ✔ Annonce validée
                  </span>
                )}
              </div>

              <span
                style={{
                  fontSize: '26px',
                  fontWeight: 'bold',
                  color: '#27ae60',
                  whiteSpace: 'nowrap',
                }}
              >
                {annoncePrice}
              </span>
            </div>

            {/* PROFIL AUTEUR */}
            {authorProfile ? (
              <div
                onClick={() =>
                  router.push(
                    `/profil/${sellerId}`
                  )
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  margin: '15px 0 20px 0',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border:
                      '1px solid #cbd5e1',
                    flexShrink: 0,
                  }}
                >
                  {authorProfile.avatar_url ? (
                    <img
                      src={
                        authorProfile.avatar_url
                      }
                      alt={
                        authorProfile.pseudo ||
                        'Membre TrocTruc'
                      }
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: '20px',
                      }}
                    >
                      👤
                    </span>
                  )}
                </div>

                <div
                  style={{
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#64748b',
                    }}
                  >
                    Annonce publiée par
                  </div>

                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: '#1e293b',
                    }}
                  >
                    {authorProfile.pseudo ||
                      'Membre TrocTruc'}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '12px',
                    color: '#2563eb',
                    fontWeight: '600',
                  }}
                >
                  Voir le profil →
                </span>
              </div>
            ) : sellerId ? (
              <div
                onClick={() =>
                  router.push(
                    `/profil/${sellerId}`
                  )
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  margin: '15px 0 20px 0',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border:
                      '1px solid #cbd5e1',
                  }}
                >
                  👤
                </div>

                <div
                  style={{
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#64748b',
                    }}
                  >
                    Annonce publiée par
                  </div>

                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: '#1e293b',
                    }}
                  >
                    Membre TrocTruc
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '12px',
                    color: '#2563eb',
                    fontWeight: '600',
                  }}
                >
                  Voir le profil →
                </span>
              </div>
            ) : null}

            <hr
              style={{
                border: 'none',
                borderTop:
                  '1px solid #e1e4e8',
                margin: '20px 0',
              }}
            />

            <h2
              style={{
                fontSize: '18px',
                color: '#2c3e50',
                marginBottom: '10px',
              }}
            >
              Description
            </h2>

            <p
              style={{
                color: '#555',
                lineHeight: '1.6',
                fontSize: '15px',
                whiteSpace: 'pre-line',
                marginBottom: '30px',
              }}
            >
              {annonceDesc}
            </p>

            {/* ACTIONS / CHAT */}
            {currentUser &&
            currentUser.id !== sellerId ? (
              <div>
                {!showChat ? (
                  <button
                    type="button"
                    onClick={() =>
                      setShowChat(true)
                    }
                    style={{
                      backgroundColor:
                        '#27ae60',
                      color: 'white',
                      border: 'none',
                      padding: '14px 20px',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      width: '100%',
                      boxShadow:
                        '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    💬 Contacter le vendeur
                  </button>
                ) : (
                  <div
                    style={{
                      marginTop: '20px',
                    }}
                  >
                    <ChatModal
                      annonceId={annonce.id}
                      sellerId={sellerId}
                      currentUserId={
                        currentUser.id
                      }
                      onClose={() =>
                        setShowChat(false)
                      }
                    />
                  </div>
                )}
              </div>
            ) : !currentUser ? (
              <button
                type="button"
                onClick={() =>
                  router.push('/auth')
                }
                style={{
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Connectez-vous pour contacter le
                vendeur
              </button>
            ) : isOwner ? (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '18px',
                }}
              >
                <div
                  style={{
                    color: '#475569',
                    textAlign: 'center',
                    marginBottom: '14px',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  Ceci est votre propre annonce.
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      '1fr 1fr',
                    gap: '10px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/annonces/${annonce.id}/modifier`
                      )
                    }
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    ✏️ Modifier mon annonce
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleDeleteOwnAnnonce
                    }
                    disabled={deleting}
                    style={{
                      backgroundColor: '#fff1f2',
                      color: '#be123c',
                      border:
                        '1px solid #fecdd3',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: deleting
                        ? 'wait'
                        : 'pointer',
                      opacity: deleting
                        ? 0.65
                        : 1,
                    }}
                  >
                    {deleting
                      ? 'Suppression...'
                      : '🗑️ Supprimer mon annonce'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}