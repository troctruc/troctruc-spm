'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ChatModal from '@/components/ChatModal'
import Link from 'next/link'


// ============================================================
// FONCTION POUR RÉCUPÉRER L'URL D'UNE IMAGE SUPABASE
// ============================================================

function getImageUrl(imagePath: any) {
  if (!imagePath) return null

  // Si on reçoit un tableau, prendre la première image
  if (Array.isArray(imagePath)) {
    imagePath = imagePath[0]
  }

  // Si la valeur est vide ou n'est pas une chaîne
  if (!imagePath || typeof imagePath !== 'string') {
    return null
  }

  imagePath = imagePath.trim()

  if (!imagePath) {
    return null
  }

  // ----------------------------------------------------------
  // Si c'est déjà une URL complète
  // ----------------------------------------------------------

  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://')
  ) {
    return imagePath
  }


  // ----------------------------------------------------------
  // Si le champ contient plusieurs images séparées par virgule
  // ----------------------------------------------------------

  if (imagePath.includes(',')) {
    imagePath = imagePath.split(',')[0].trim()
  }


  // ----------------------------------------------------------
  // Si le champ contient un tableau JSON
  // Exemple : ["photo1.jpg","photo2.jpg"]
  // ----------------------------------------------------------

  if (
    imagePath.startsWith('[') &&
    imagePath.endsWith(']')
  ) {
    try {
      const parsed = JSON.parse(imagePath)

      if (Array.isArray(parsed) && parsed.length > 0) {
        imagePath = parsed[0]

        if (
          typeof imagePath === 'string' &&
          (
            imagePath.startsWith('http://') ||
            imagePath.startsWith('https://')
          )
        ) {
          return imagePath
        }
      }
    } catch (e) {
      console.warn('Impossible de lire le tableau d images :', e)
    }
  }


  // ----------------------------------------------------------
  // Nettoyage du chemin
  // ----------------------------------------------------------

  imagePath = imagePath
    .replace(/^\/+/, '')
    .replace(/^annonces-images\//, '')


  // ----------------------------------------------------------
  // Création de l'URL publique Supabase
  // Bucket : annonces-images
  // ----------------------------------------------------------

  try {
    const { data } = supabase.storage
      .from('annonces-images')
      .getPublicUrl(imagePath)

    if (data?.publicUrl) {
      return data.publicUrl
    }

    return null

  } catch (e) {
    console.error('Erreur création URL image :', e)
    return null
  }
}



// ============================================================
// PAGE DES CONVERSATIONS
// ============================================================

export default function ConversationsPage() {

  const [conversations, setConversations] = useState<any[]>([])
  const [blockedUsers, setBlockedUsers] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'conversations' | 'blocked'>('conversations')
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [activeAnnonce, setActiveAnnonce] = useState<any>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [activeOtherUserId, setActiveOtherUserId] = useState<string | null>(null)


  // ==========================================================
  // CHARGEMENT INITIAL
  // ==========================================================

  useEffect(() => {
    fetchData()
  }, [])


  // ==========================================================
  // RÉCUPÉRATION DES DONNÉES
  // ==========================================================

  async function fetchData() {

    setLoading(true)


    // --------------------------------------------------------
    // Utilisateur connecté
    // --------------------------------------------------------

    const {
      data: { user }
    } = await supabase.auth.getUser()


    if (!user) {
      setLoading(false)
      return
    }


    setCurrentUser(user)


    // --------------------------------------------------------
    // 1. Récupérer les utilisateurs bloqués
    // --------------------------------------------------------

    const { data: blocksData } = await supabase
      .from('blocks')
      .select('id, blocked_id')
      .eq('blocker_id', user.id)


    const blockedList = blocksData || []

    setBlockedUsers(blockedList)

    const blockedIds = blockedList.map(
      b => b.blocked_id
    )


    // --------------------------------------------------------
    // 2. Récupérer les conversations
    // --------------------------------------------------------

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(
        `buyer_id.eq.${user.id},seller_id.eq.${user.id}`
      )
      .order('created_at', {
        ascending: false
      })


    if (error) {

      console.error(
        "Erreur Supabase conversations :",
        error.message
      )

      setLoading(false)

      return
    }


    // --------------------------------------------------------
    // Enrichir chaque conversation avec son annonce
    // --------------------------------------------------------

    if (data) {

      const enrichedConversations = await Promise.all(

        data.map(async (conv) => {


          // --------------------------------------------------
          // Récupérer l'annonce associée
          // --------------------------------------------------

          const { data: annonceData } = await supabase
            .from('annonces')
            .select('*')
            .eq('id', conv.annonce_id)
            .maybeSingle()


          // --------------------------------------------------
          // Récupérer le dernier message
          // --------------------------------------------------

          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('sender_id, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', {
              ascending: false
            })
            .limit(1)
            .maybeSingle()


          // --------------------------------------------------
          // Vérifier si le message est non lu
          // --------------------------------------------------

          let hasUnread = false


          if (
            lastMessageData &&
            lastMessageData.sender_id !== user.id
          ) {

            const isBuyer =
              conv.buyer_id === user.id


            const lastReadAt =
              isBuyer
                ? conv.last_read_buyer_at
                : conv.last_read_seller_at


            if (!lastReadAt) {

              hasUnread = true

            } else {

              hasUnread =
                new Date(
                  lastMessageData.created_at
                ).getTime()
                >
                new Date(
                  lastReadAt
                ).getTime()

            }
          }


          return {

            ...conv,

            annonces:
              annonceData || null,

            hasUnread

          }

        })

      )


      // ------------------------------------------------------
      // Filtrer les utilisateurs bloqués
      // ------------------------------------------------------

      const filtered =
        enrichedConversations.filter(
          (conv: any) => {

            const otherId =
              conv.seller_id === user.id
                ? conv.buyer_id
                : conv.seller_id

            return !blockedIds.includes(otherId)

          }
        )


      setConversations(filtered)

    }


    setLoading(false)

  }



  // ==========================================================
  // OUVRIR UNE CONVERSATION
  // ==========================================================

  async function handleOpenConversation(
    annonce: any,
    convId: string,
    otherUserId: string
  ) {

    if (currentUser) {

      const currentConv =
        conversations.find(
          c => c.id === convId
        )


      if (currentConv) {

        const isBuyer =
          currentConv.buyer_id === currentUser.id


        const fieldToUpdate =
          isBuyer
            ? 'last_read_buyer_at'
            : 'last_read_seller_at'


        await supabase
          .from('conversations')
          .update({
            [fieldToUpdate]:
              new Date().toISOString()
          })
          .eq('id', convId)

      }

    }


    setActiveAnnonce(
      annonce || {
        id: 'inconnue',
        titre: 'Annonce introuvable'
      }
    )


    setActiveConversationId(convId)

    setActiveOtherUserId(otherUserId)

  }



  // ==========================================================
  // SUPPRIMER UNE CONVERSATION
  // ==========================================================

  async function handleDeleteConversation(
    e: React.MouseEvent,
    conversationId: string
  ) {

    e.stopPropagation()


    if (
      !confirm(
        "Voulez-vous vraiment supprimer cette discussion ?"
      )
    ) {
      return
    }


    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)


    if (error) {

      alert(
        "Erreur lors de la suppression : "
        + error.message
      )

    } else {

      setConversations(
        conversations.filter(
          c => c.id !== conversationId
        )
      )


      if (
        activeConversationId === conversationId
      ) {

        setActiveAnnonce(null)

        setActiveConversationId(null)

      }

    }

  }



  // ==========================================================
  // BLOQUER UN UTILISATEUR
  // ==========================================================

  async function handleBlockUser(
    e: React.MouseEvent,
    userIdToBlock: string
  ) {

    e.stopPropagation()


    if (
      !confirm(
        "Voulez-vous vraiment bloquer cet utilisateur ?"
      )
    ) {
      return
    }


    const { error } = await supabase
      .from('blocks')
      .insert([
        {
          blocker_id: currentUser.id,
          blocked_id: userIdToBlock
        }
      ])


    if (error) {

      alert(
        "Erreur lors du blocage : "
        + error.message
      )

    } else {

      alert(
        "Utilisateur bloqué avec succès."
      )


      setActiveAnnonce(null)

      setActiveConversationId(null)

      fetchData()

    }

  }



  // ==========================================================
  // DÉBLOQUER UN UTILISATEUR
  // ==========================================================

  async function handleUnblockUser(
    blockId: string
  ) {

    if (
      !confirm(
        "Voulez-vous débloquer cet utilisateur ?"
      )
    ) {
      return
    }


    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('id', blockId)


    if (error) {

      alert(
        "Erreur lors du déblocage : "
        + error.message
      )

    } else {

      fetchData()

    }

  }



  // ==========================================================
  // CHARGEMENT
  // ==========================================================

  if (loading) {

    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          fontFamily: 'sans-serif'
        }}
      >
        Chargement...
      </div>
    )

  }



  // ==========================================================
  // DISCUSSION OUVERTE
  // ==========================================================

  if (
    activeAnnonce &&
    currentUser &&
    activeConversationId
  ) {


    // --------------------------------------------------------
    // Récupérer l'image de l'annonce
    // --------------------------------------------------------

    let rawPath =
      activeAnnonce.image_url ||
      activeAnnonce.image_urls ||
      activeAnnonce.image ||
      activeAnnonce.photo ||
      activeAnnonce.photos


    // Si tableau
    if (Array.isArray(rawPath)) {
      rawPath = rawPath[0]
    }


    // Si plusieurs images séparées par virgule
    if (
      typeof rawPath === 'string' &&
      rawPath.includes(',')
    ) {
      rawPath =
        rawPath.split(',')[0].trim()
    }


    const imageUrl =
      getImageUrl(rawPath)


    const annonceTitle =
      activeAnnonce.titre ||
      activeAnnonce.title ||
      "Annonce sans titre"


    const annonceDesc =
      activeAnnonce.description ||
      "Aucune description"



    return (

      <div
        style={{
          padding: '40px',
          maxWidth: '800px',
          margin: '0 auto',
          fontFamily: 'sans-serif',
          position: 'relative'
        }}
      >


        {/* --------------------------------------------------
            BARRE DU HAUT
        -------------------------------------------------- */}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}
        >

          <button
            onClick={() => {
              setActiveAnnonce(null)
              setActiveConversationId(null)
              fetchData()
            }}
            style={{
              padding: '8px 15px',
              cursor: 'pointer',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              fontWeight: '500'
            }}
          >
            ← Retour à mes discussions
          </button>


          {activeOtherUserId && (

            <button
              onClick={(e) =>
                handleBlockUser(
                  e,
                  activeOtherUserId
                )
              }
              style={{
                padding: '8px 15px',
                cursor: 'pointer',
                borderRadius: '6px',
                border: '1px solid #e74c3c',
                backgroundColor: '#fff',
                color: '#e74c3c',
                fontWeight: 'bold'
              }}
            >
              🚫 Bloquer l'utilisateur
            </button>

          )}

        </div>



        {/* --------------------------------------------------
            ANNONCE
        -------------------------------------------------- */}

        <div
          style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            boxShadow:
              '0 4px 6px rgba(0,0,0,0.05)'
          }}
        >


          {imageUrl ? (

            <img
              src={imageUrl}
              alt={annonceTitle}
              style={{
                width: '100%',
                maxHeight: '400px',
                objectFit: 'cover',
                borderRadius: '8px',
                marginBottom: '20px'
              }}
            />

          ) : (

            <div
              style={{
                width: '100%',
                height: '200px',
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                marginBottom: '20px'
              }}
            >
              Aucune image pour cette annonce
            </div>

          )}



          <h1
            style={{
              fontSize: '24px',
              color: '#2c3e50',
              marginBottom: '10px'
            }}
          >
            {annonceTitle}
          </h1>


          <p
            style={{
              color: '#555',
              lineHeight: '1.6',
              fontSize: '15px'
            }}
          >
            {annonceDesc}
          </p>

        </div>



        {/* --------------------------------------------------
            CHAT
        -------------------------------------------------- */}

        <ChatModal
          annonceId={activeAnnonce.id}
          sellerId={activeAnnonce.user_id}
          currentUserId={currentUser.id}
          conversationId={activeConversationId}
          onClose={() => {
            setActiveAnnonce(null)
            setActiveConversationId(null)
            fetchData()
          }}
        />

      </div>

    )

  }



  // ==========================================================
  // PAGE PRINCIPALE
  // ==========================================================


  return (

    <div
      style={{
        padding: '40px',
        maxWidth: '600px',
        margin: '0 auto',
        fontFamily: 'sans-serif'
      }}
    >


      {/* ------------------------------------------------------
          TITRE
      ------------------------------------------------------ */}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}
      >

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}
        >

          <img
            src="/puffin-logo.jpeg"
            alt="Logo TrocTruc SPM"
            style={{
              width: '45px',
              height: '45px',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
          />


          <h1
            style={{
              margin: 0,
              fontSize: '28px',
              color: '#1e293b'
            }}
          >
            Mes Messages
          </h1>

        </div>



        <Link
          href="/"
          style={{
            padding: '8px 16px',
            backgroundColor: '#f1f5f9',
            borderRadius: '6px',
            color: '#475569',
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '14px',
            border: '1px solid #cbd5e1'
          }}
        >
          Accueil
        </Link>

      </div>



      {/* ------------------------------------------------------
          ONGLETS
      ------------------------------------------------------ */}

      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginTop: '20px',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '10px'
        }}
      >


        <button
          onClick={() =>
            setActiveTab('conversations')
          }
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            backgroundColor:
              activeTab === 'conversations'
                ? '#2ecc71'
                : '#e2e8f0',
            color:
              activeTab === 'conversations'
                ? 'white'
                : '#475569'
          }}
        >
          Discussions ({conversations.length})
        </button>



        <button
          onClick={() =>
            setActiveTab('blocked')
          }
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            backgroundColor:
              activeTab === 'blocked'
                ? '#e74c3c'
                : '#e2e8f0',
            color:
              activeTab === 'blocked'
                ? 'white'
                : '#475569'
          }}
        >
          Utilisateurs bloqués ({blockedUsers.length})
        </button>

      </div>



      {/* ======================================================
          DISCUSSIONS
      ====================================================== */}

      {activeTab === 'conversations' && (

        <div
          style={{
            marginTop: '20px'
          }}
        >

          {conversations.length === 0 ? (

            <p
              style={{
                color: '#666'
              }}
            >
              Vous n'avez aucune discussion pour le moment.
            </p>

          ) : (

            <ul
              style={{
                listStyle: 'none',
                padding: 0
              }}
            >

              {conversations.map((conv) => {


                const annonce =
                  conv.annonces ||
                  {
                    titre: 'Annonce'
                  }



                // ------------------------------------------------
                // RÉCUPÉRATION DE L'IMAGE DE LA MINIATURE
                // ------------------------------------------------

                let rawPath =
                  annonce.image_url ||
                  annonce.image_urls ||
                  annonce.image ||
                  annonce.photo ||
                  annonce.photos


                // Si tableau
                if (Array.isArray(rawPath)) {
                  rawPath = rawPath[0]
                }


                // Si plusieurs images dans une chaîne
                if (
                  typeof rawPath === 'string' &&
                  rawPath.includes(',')
                ) {
                  rawPath =
                    rawPath.split(',')[0].trim()
                }


                // Construction de l'URL Supabase
                const thumbUrl =
                  getImageUrl(rawPath)



                const annonceTitle =
                  annonce.titre ||
                  annonce.title ||
                  "Annonce"



                const otherUserId =
                  conv.seller_id === currentUser.id
                    ? conv.buyer_id
                    : conv.seller_id



                return (

                  <li
                    key={conv.id}
                    style={{
                      marginBottom: '15px'
                    }}
                  >

                    <div
                      onClick={() =>
                        handleOpenConversation(
                          annonce,
                          conv.id,
                          otherUserId
                        )
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        backgroundColor:
                          conv.hasUnread
                            ? '#eef9f1'
                            : '#f8f9fa',
                        border:
                          conv.hasUnread
                            ? '1px solid #2ecc71'
                            : '1px solid #cbd5e1',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow:
                          '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                    >


                      {/* ------------------------------------------
                          MINIATURE + TITRE
                      ------------------------------------------ */}

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '15px',
                          minWidth: 0
                        }}
                      >


                        {thumbUrl ? (

                          <img
                            src={thumbUrl}
                            alt=""
                            onError={(e) => {
                              console.error(
                                "Impossible de charger la miniature :",
                                thumbUrl
                              )

                              e.currentTarget.style.display =
                                'none'
                            }}
                            style={{
                              width: '50px',
                              height: '50px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              flexShrink: 0
                            }}
                          />

                        ) : (

                          <div
                            style={{
                              width: '50px',
                              height: '50px',
                              backgroundColor: '#e2e8f0',
                              borderRadius: '6px',
                              flexShrink: 0
                            }}
                          />

                        )}



                        <div
                          style={{
                            minWidth: 0
                          }}
                        >

                          <h3
                            style={{
                              margin: '0 0 4px 0',
                              fontSize: '15px',
                              color: '#2c3e50',
                              fontWeight:
                                conv.hasUnread
                                  ? 'bold'
                                  : 'normal',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >

                            {annonceTitle}{' '}

                            {conv.hasUnread && (

                              <span
                                style={{
                                  color: '#2ecc71',
                                  fontSize: '12px'
                                }}
                              >
                                ● Nouveau
                              </span>

                            )}

                          </h3>



                          <span
                            style={{
                              fontSize: '12px',
                              color:
                                conv.hasUnread
                                  ? '#27ae60'
                                  : '#7f8c8d',
                              fontWeight:
                                conv.hasUnread
                                  ? 'bold'
                                  : 'normal'
                            }}
                          >

                            {conv.hasUnread
                              ? "Nouveau message reçu"
                              : "Voir l'annonce et discuter"}

                          </span>

                        </div>

                      </div>



                      {/* ------------------------------------------
                          BOUTONS
                      ------------------------------------------ */}

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexShrink: 0
                        }}
                      >


                        {/* SUPPRIMER */}

                        <button
                          onClick={(e) =>
                            handleDeleteConversation(
                              e,
                              conv.id
                            )
                          }
                          title="Supprimer la discussion"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '18px',
                            padding: '6px'
                          }}
                        >
                          🗑️
                        </button>



                        {/* BLOQUER */}

                        <button
                          onClick={(e) =>
                            handleBlockUser(
                              e,
                              otherUserId
                            )
                          }
                          title="Bloquer l'utilisateur"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '18px',
                            padding: '6px'
                          }}
                        >
                          🚫
                        </button>

                      </div>

                    </div>

                  </li>

                )

              })}

            </ul>

          )}

        </div>

      )}



      {/* ======================================================
          UTILISATEURS BLOQUÉS
      ====================================================== */}

      {activeTab === 'blocked' && (

        <div
          style={{
            marginTop: '20px'
          }}
        >

          {blockedUsers.length === 0 ? (

            <p
              style={{
                color: '#666'
              }}
            >
              Vous n'avez bloqué aucun utilisateur.
            </p>

          ) : (

            <ul
              style={{
                listStyle: 'none',
                padding: 0
              }}
            >

              {blockedUsers.map((item) => (

                <li
                  key={item.id}
                  style={{
                    marginBottom: '15px'
                  }}
                >

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      backgroundColor: '#fff5f5',
                      border: '1px solid #feb2b2',
                      borderRadius: '8px'
                    }}
                  >


                    <span
                      style={{
                        fontSize: '14px',
                        color: '#c53030',
                        fontWeight: '500'
                      }}
                    >
                      Utilisateur bloqué
                      {' '}
                      (ID : {item.blocked_id.slice(0, 8)}...)
                    </span>



                    <button
                      onClick={() =>
                        handleUnblockUser(
                          item.id
                        )
                      }
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#fff',
                        border: '1px solid #e74c3c',
                        color: '#e74c3c',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 'bold'
                      }}
                    >
                      Débloquer
                    </button>

                  </div>

                </li>

              ))}

            </ul>

          )}

        </div>

      )}

    </div>

  )

}