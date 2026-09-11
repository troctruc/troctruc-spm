'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ChatModal from '@/components/ChatModal'
import Link from 'next/link'

export default function ConversationsPage() {
  const [conversations, setConversations] =
    useState<any[]>([])

  const [blockedUsers, setBlockedUsers] =
    useState<any[]>([])

  const [activeTab, setActiveTab] =
    useState<
      'conversations' | 'blocked'
    >('conversations')

  const [loading, setLoading] =
    useState(true)

  const [currentUser, setCurrentUser] =
    useState<any>(null)

  const [activeAnnonce, setActiveAnnonce] =
    useState<any>(null)

  const [
    activeConversationId,
    setActiveConversationId
  ] =
    useState<string | null>(null)

  const [
    activeOtherUserId,
    setActiveOtherUserId
  ] =
    useState<string | null>(null)

  const [
    activeConversationBlocked,
    setActiveConversationBlocked
  ] =
    useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    setCurrentUser(user)

    /*
     * UTILISATEURS BLOQUÉS
     */
    const {
      data: blocksData,
      error: blockError
    } = await supabase
      .from('blocks')
      .select(
        'id, blocked_id'
      )
      .eq(
        'blocker_id',
        user.id
      )

    if (blockError) {
      console.error(
        'Erreur récupération blocs :',
        blockError.message
      )
    }

    const blockedList =
      blocksData || []

    setBlockedUsers(
      blockedList
    )

    const blockedIds =
      blockedList.map(
        (b) =>
          b.blocked_id
      )

    /*
     * CONVERSATIONS
     */
    const {
      data,
      error
    } = await supabase
      .from('conversations')
      .select('*')
      .or(
        `buyer_id.eq.${user.id},seller_id.eq.${user.id}`
      )

    if (error) {
      console.error(
        'Erreur Supabase conversations :',
        error.message
      )
    }

    if (data) {
      const enrichedConversations =
        await Promise.all(
          data.map(
            async (conv) => {
              /*
               * ANNONCE ASSOCIÉE
               */
              const {
                data: annonceData
              } = await supabase
                .from('annonces')
                .select('*')
                .eq(
                  'id',
                  conv.annonce_id
                )
                .maybeSingle()

              /*
               * DERNIER MESSAGE
               */
              const {
                data:
                  lastMessageData
              } = await supabase
                .from('messages')
                .select(
                  'sender_id, created_at, content, read_at'
                )
                .eq(
                  'conversation_id',
                  conv.id
                )
                .order(
                  'created_at',
                  {
                    ascending:
                      false
                  }
                )
                .limit(1)
                .maybeSingle()

              /*
               * NOMBRE DE MESSAGES
               * NON LUS
               */
              const {
                count:
                  unreadCount
              } = await supabase
                .from('messages')
                .select(
                  'id',
                  {
                    count:
                      'exact',
                    head:
                      true
                  }
                )
                .eq(
                  'conversation_id',
                  conv.id
                )
                .neq(
                  'sender_id',
                  user.id
                )
                .is(
                  'read_at',
                  null
                )

              const otherId =
                conv.seller_id ===
                user.id
                  ? conv.buyer_id
                  : conv.seller_id

              const isBlocked =
                blockedIds.includes(
                  otherId
                )

              return {
                ...conv,

                annonces:
                  annonceData ||
                  null,

                hasUnread:
                  (unreadCount ||
                    0) > 0,

                unreadCount:
                  unreadCount ||
                  0,

                isBlocked,

                lastMessageAt:
                  lastMessageData
                    ?.created_at ||
                  conv.created_at,

                lastMessage:
                  lastMessageData
                    ?.content ||
                  null
              }
            }
          )
        )

      /*
       * PLUS DE FILTRAGE DES
       * UTILISATEURS BLOQUÉS.
       *
       * Les conversations restent
       * visibles dans l'historique.
       */
      const sorted = [
        ...enrichedConversations
      ].sort(
        (a, b) =>
          new Date(
            b.lastMessageAt
          ).getTime() -
          new Date(
            a.lastMessageAt
          ).getTime()
      )

      setConversations(
        sorted
      )
    }

    setLoading(false)
  }

  async function handleOpenConversation(
    annonce: any,
    convId: string,
    otherUserId: string,
    isBlocked: boolean
  ) {
    setActiveAnnonce(
      annonce || {
        id: 'inconnue',
        titre:
          'Annonce introuvable'
      }
    )

    setActiveConversationId(
      convId
    )

    setActiveOtherUserId(
      otherUserId
    )

    setActiveConversationBlocked(
      isBlocked
    )
  }

  /*
   * SUPPRIMER UNE DISCUSSION
   */
  async function handleDeleteConversation(
    e: React.MouseEvent,
    conversationId: string
  ) {
    e.stopPropagation()

    if (
      !confirm(
        'Voulez-vous vraiment supprimer cette discussion ?'
      )
    ) {
      return
    }

    const {
      error
    } = await supabase
      .from('conversations')
      .delete()
      .eq(
        'id',
        conversationId
      )

    if (error) {
      alert(
        'Erreur lors de la suppression : ' +
          error.message
      )
    } else {
      setConversations(
        conversations.filter(
          (c) =>
            c.id !==
            conversationId
        )
      )

      if (
        activeConversationId ===
        conversationId
      ) {
        setActiveAnnonce(null)
        setActiveConversationId(
          null
        )
        setActiveOtherUserId(
          null
        )
        setActiveConversationBlocked(
          false
        )
      }
    }
  }

  /*
   * BLOQUER UN UTILISATEUR
   */
  async function handleBlockUser(
    e: React.MouseEvent,
    userIdToBlock: string
  ) {
    e.stopPropagation()

    if (
      !confirm(
        "Voulez-vous vraiment bloquer cet utilisateur ? Vous ne pourrez plus échanger ensemble."
      )
    ) {
      return
    }

    const {
      error
    } = await supabase
      .from('blocks')
      .insert([
        {
          blocker_id:
            currentUser.id,
          blocked_id:
            userIdToBlock
        }
      ])

    if (error) {
      alert(
        'Erreur lors du blocage : ' +
          error.message
      )
    } else {
      alert(
        'Utilisateur bloqué avec succès.'
      )

      setActiveAnnonce(null)
      setActiveConversationId(
        null
      )
      setActiveOtherUserId(
        null
      )
      setActiveConversationBlocked(
        false
      )

      fetchData()
    }
  }

  /*
   * DÉBLOQUER
   */
  async function handleUnblockUser(
    blockId: string
  ) {
    if (
      !confirm(
        'Voulez-vous débloquer cet utilisateur ?'
      )
    ) {
      return
    }

    const {
      error
    } = await supabase
      .from('blocks')
      .delete()
      .eq(
        'id',
        blockId
      )

    if (error) {
      alert(
        'Erreur lors du déblocage : ' +
          error.message
      )
    } else {
      fetchData()
    }
  }

  if (loading) {
    return (
      <div
        style={{
          padding:
            '40px',
          textAlign:
            'center',
          fontFamily:
            'sans-serif'
        }}
      >
        Chargement...
      </div>
    )
  }

  /*
   * DISCUSSION OUVERTE
   */
  if (
    activeAnnonce &&
    currentUser &&
    activeConversationId
  ) {
    const annonceTitle =
      activeAnnonce.titre ||
      activeAnnonce.title ||
      'Annonce sans titre'

    const annonceDesc =
      activeAnnonce.description ||
      'Aucune description'

    return (
      <div
        style={{
          padding:
            '40px',
          maxWidth:
            '800px',
          margin:
            '0 auto',
          fontFamily:
            'sans-serif',
          position:
            'relative'
        }}
      >
        <div
          style={{
            display:
              'flex',
            justifyContent:
              'space-between',
            alignItems:
              'center',
            marginBottom:
              '20px',
            gap:
              '10px',
            flexWrap:
              'wrap'
          }}
        >
          <button
            onClick={() => {
              setActiveAnnonce(
                null
              )

              setActiveConversationId(
                null
              )

              setActiveOtherUserId(
                null
              )

              setActiveConversationBlocked(
                false
              )

              fetchData()
            }}
            style={{
              padding:
                '8px 15px',
              cursor:
                'pointer',
              borderRadius:
                '6px',
              border:
                '1px solid #cbd5e1',
              backgroundColor:
                '#fff',
              fontWeight:
                '500'
            }}
          >
            ← Retour à mes discussions
          </button>

          {activeOtherUserId &&
            !activeConversationBlocked && (
              <button
                onClick={(e) =>
                  handleBlockUser(
                    e,
                    activeOtherUserId
                  )
                }
                style={{
                  padding:
                    '8px 15px',
                  cursor:
                    'pointer',
                  borderRadius:
                    '6px',
                  border:
                    '1px solid #e74c3c',
                  backgroundColor:
                    '#fff',
                  color:
                    '#e74c3c',
                  fontWeight:
                    'bold'
                }}
              >
                🚫 Bloquer l'utilisateur
              </button>
            )}
        </div>

        <div
          style={{
            backgroundColor:
              'white',
            padding:
              '24px',
            borderRadius:
              '12px',
            border:
              '1px solid #cbd5e1',
            boxShadow:
              '0 4px 6px rgba(0,0,0,0.05)'
          }}
        >
          <h1
            style={{
              fontSize:
                '22px',
              color:
                '#2c3e50',
              margin:
                '0 0 12px 0'
            }}
          >
            {annonceTitle}
          </h1>

          <p
            style={{
              color:
                '#555',
              lineHeight:
                '1.6',
              fontSize:
                '14px',
              margin:
                0,
              whiteSpace:
                'pre-line'
            }}
          >
            {annonceDesc}
          </p>
        </div>

        <ChatModal
          annonceId={
            activeAnnonce.id
          }
          sellerId={
            activeAnnonce.user_id
          }
          currentUserId={
            currentUser.id
          }
          conversationId={
            activeConversationId
          }
          isBlocked={
            activeConversationBlocked
          }
          onClose={() => {
            setActiveAnnonce(
              null
            )

            setActiveConversationId(
              null
            )

            setActiveOtherUserId(
              null
            )

            setActiveConversationBlocked(
              false
            )

            fetchData()
          }}
        />
      </div>
    )
  }

  /*
   * PAGE MES MESSAGES
   */
  return (
    <div
      style={{
        padding:
          '40px',
        maxWidth:
          '650px',
        margin:
          '0 auto',
        fontFamily:
          'sans-serif'
      }}
    >
      {/* EN-TÊTE */}
      <div
        style={{
          display:
            'flex',
          justifyContent:
            'space-between',
          alignItems:
            'center',
          marginBottom:
            '20px'
        }}
      >
        <div
          style={{
            display:
              'flex',
            alignItems:
              'center',
            gap:
              '15px'
          }}
        >
          <img
            src="/puffin-logo.jpeg"
            alt="Logo TrocTruc SPM"
            style={{
              width:
                '45px',
              height:
                '45px',
              objectFit:
                'contain',
              borderRadius:
                '8px'
            }}
          />

          <h1
            style={{
              margin:
                0,
              fontSize:
                '26px',
              color:
                '#1e293b'
            }}
          >
            Mes Messages
          </h1>
        </div>

        <Link
          href="/"
          style={{
            padding:
              '8px 16px',
            backgroundColor:
              '#f1f5f9',
            borderRadius:
              '6px',
            color:
              '#475569',
            textDecoration:
              'none',
            fontWeight:
              '500',
            fontSize:
              '14px',
            border:
              '1px solid #cbd5e1'
          }}
        >
          Accueil
        </Link>
      </div>

      {/* ONGLETS */}
      <div
        style={{
          display:
            'flex',
          gap:
            '10px',
          marginTop:
            '20px',
          borderBottom:
            '2px solid #e2e8f0',
          paddingBottom:
            '10px'
        }}
      >
        <button
          onClick={() =>
            setActiveTab(
              'conversations'
            )
          }
          style={{
            padding:
              '8px 16px',
            borderRadius:
              '6px',
            border:
              'none',
            cursor:
              'pointer',
            fontWeight:
              'bold',
            backgroundColor:
              activeTab ===
              'conversations'
                ? '#2ecc71'
                : '#e2e8f0',
            color:
              activeTab ===
              'conversations'
                ? 'white'
                : '#475569'
          }}
        >
          Discussions (
          {conversations.length})
        </button>

        <button
          onClick={() =>
            setActiveTab(
              'blocked'
            )
          }
          style={{
            padding:
              '8px 16px',
            borderRadius:
              '6px',
            border:
              'none',
            cursor:
              'pointer',
            fontWeight:
              'bold',
            backgroundColor:
              activeTab ===
              'blocked'
                ? '#e74c3c'
                : '#e2e8f0',
            color:
              activeTab ===
              'blocked'
                ? 'white'
                : '#475569'
          }}
        >
          Utilisateurs bloqués (
          {blockedUsers.length})
        </button>
      </div>

      {/* DISCUSSIONS */}
      {activeTab ===
        'conversations' && (
        <div
          style={{
            marginTop:
              '20px'
          }}
        >
          {conversations.length ===
          0 ? (
            <p
              style={{
                color:
                  '#666'
              }}
            >
              Vous n'avez aucune discussion pour le moment.
            </p>
          ) : (
            <ul
              style={{
                listStyle:
                  'none',
                padding:
                  0
              }}
            >
              {conversations.map(
                (conv) => {
                  const annonce =
                    conv.annonces || {
                      titre:
                        'Annonce'
                    }

                  const annonceTitle =
                    annonce.titre ||
                    annonce.title ||
                    'Annonce'

                  const otherUserId =
                    conv.seller_id ===
                    currentUser.id
                      ? conv.buyer_id
                      : conv.seller_id

                  const isUnread =
                    conv.hasUnread

                  const isBlocked =
                    conv.isBlocked

                  return (
                    <li
                      key={
                        conv.id
                      }
                      style={{
                        marginBottom:
                          '12px'
                      }}
                    >
                      <div
                        onClick={() =>
                          handleOpenConversation(
                            annonce,
                            conv.id,
                            otherUserId,
                            isBlocked
                          )
                        }
                        style={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'space-between',
                          padding:
                            '14px 18px',
                          backgroundColor:
                            isBlocked
                              ? '#fff7ed'
                              : isUnread
                                ? '#f0fdf4'
                                : '#ffffff',
                          border:
                            isBlocked
                              ? '1px solid #fed7aa'
                              : isUnread
                                ? '1.5px solid #22c55e'
                                : '1px solid #e2e8f0',
                          borderRadius:
                            '10px',
                          cursor:
                            'pointer',
                          boxShadow:
                            isUnread &&
                            !isBlocked
                              ? '0 3px 8px rgba(34, 197, 94, 0.12)'
                              : '0 1px 3px rgba(0,0,0,0.04)',
                          transition:
                            'all 0.15s ease-in-out'
                        }}
                      >
                        <div
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'center',
                            gap:
                              '15px',
                            flex:
                              1,
                            minWidth:
                              0
                          }}
                        >
                          <div
                            style={{
                              width:
                                '46px',
                              height:
                                '46px',
                              backgroundColor:
                                isBlocked
                                  ? '#ffedd5'
                                  : isUnread
                                    ? '#dcfce7'
                                    : '#f1f5f9',
                              borderRadius:
                                '10px',
                              display:
                                'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'center',
                              fontSize:
                                '20px',
                              flexShrink:
                                0,
                              border:
                                isBlocked
                                  ? '1px solid #fdba74'
                                  : isUnread
                                    ? '1px solid #86efac'
                                    : '1px solid #e2e8f0',
                              position:
                                'relative'
                            }}
                          >
                            {isBlocked
                              ? '🚫'
                              : '💬'}

                            {isUnread &&
                              !isBlocked && (
                                <span
                                  style={{
                                    position:
                                      'absolute',
                                    top:
                                      '-3px',
                                    right:
                                      '-3px',
                                    width:
                                      '10px',
                                    height:
                                      '10px',
                                    backgroundColor:
                                      '#22c55e',
                                    borderRadius:
                                      '50%',
                                    border:
                                      '2px solid white'
                                  }}
                                />
                              )}
                          </div>

                          <div
                            style={{
                              minWidth:
                                0,
                              flex:
                                1
                            }}
                          >
                            <h3
                              style={{
                                margin:
                                  '0 0 3px 0',
                                fontSize:
                                  '15px',
                                color:
                                  '#334155',
                                fontWeight:
                                  isUnread
                                    ? '800'
                                    : '600',
                                whiteSpace:
                                  'nowrap',
                                overflow:
                                  'hidden',
                                textOverflow:
                                  'ellipsis'
                              }}
                            >
                              {
                                annonceTitle
                              }
                            </h3>

                            <span
                              style={{
                                fontSize:
                                  '12px',
                                color:
                                  isBlocked
                                    ? '#c2410c'
                                    : isUnread
                                      ? '#16a34a'
                                      : '#94a3b8',
                                fontWeight:
                                  isBlocked ||
                                  isUnread
                                    ? '700'
                                    : 'normal'
                              }}
                            >
                              {isBlocked
                                ? '🚫 Utilisateur bloqué'
                                : isUnread
                                  ? conv.unreadCount > 1
                                    ? `● ${conv.unreadCount} nouveaux messages`
                                    : '● Nouveau message non lu'
                                  : 'Discussion ouverte'}
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'center',
                            gap:
                              '4px',
                            marginLeft:
                              '12px'
                          }}
                        >
                          <button
                            onClick={(
                              e
                            ) =>
                              handleDeleteConversation(
                                e,
                                conv.id
                              )
                            }
                            title="Supprimer la discussion"
                            style={{
                              background:
                                'none',
                              border:
                                'none',
                              cursor:
                                'pointer',
                              fontSize:
                                '18px',
                              padding:
                                '6px'
                            }}
                          >
                            🗑️
                          </button>

                          {!isBlocked && (
                            <button
                              onClick={(
                                e
                              ) =>
                                handleBlockUser(
                                  e,
                                  otherUserId
                                )
                              }
                              title="Bloquer l'utilisateur"
                              style={{
                                background:
                                  'none',
                                border:
                                  'none',
                                cursor:
                                  'pointer',
                                fontSize:
                                  '18px',
                                padding:
                                  '6px'
                              }}
                            >
                              🚫
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                }
              )}
            </ul>
          )}
        </div>
      )}

      {/* UTILISATEURS BLOQUÉS */}
      {activeTab ===
        'blocked' && (
        <div
          style={{
            marginTop:
              '20px'
          }}
        >
          {blockedUsers.length ===
          0 ? (
            <p
              style={{
                color:
                  '#666'
              }}
            >
              Vous n'avez bloqué aucun utilisateur.
            </p>
          ) : (
            <ul
              style={{
                listStyle:
                  'none',
                padding:
                  0
              }}
            >
              {blockedUsers.map(
                (item) => (
                  <li
                    key={
                      item.id
                    }
                    style={{
                      marginBottom:
                        '12px'
                    }}
                  >
                    <div
                      style={{
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'space-between',
                        padding:
                          '12px 16px',
                        backgroundColor:
                          '#fff5f5',
                        border:
                          '1px solid #feb2b2',
                        borderRadius:
                          '8px'
                      }}
                    >
                      <span
                        style={{
                          fontSize:
                            '14px',
                          color:
                            '#c53030',
                          fontWeight:
                            '500'
                        }}
                      >
                        Utilisateur bloqué
                      </span>

                      <button
                        onClick={() =>
                          handleUnblockUser(
                            item.id
                          )
                        }
                        style={{
                          padding:
                            '6px 12px',
                          backgroundColor:
                            '#fff',
                          border:
                            '1px solid #e74c3c',
                          color:
                            '#e74c3c',
                          borderRadius:
                            '6px',
                          cursor:
                            'pointer',
                          fontSize:
                            '13px',
                          fontWeight:
                            'bold'
                        }}
                      >
                        Débloquer
                      </button>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}