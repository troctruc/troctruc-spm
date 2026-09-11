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

  const [
    actionMenuId,
    setActionMenuId
  ] =
    useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  function formatMessageTime(
    dateValue: string | null | undefined
  ) {
    if (!dateValue) return ''

    const date = new Date(dateValue)

    const now = new Date()

    const sameDay =
      date.getFullYear() ===
        now.getFullYear() &&
      date.getMonth() ===
        now.getMonth() &&
      date.getDate() ===
        now.getDate()

    if (sameDay) {
      return date.toLocaleTimeString(
        [],
        {
          hour:
            '2-digit',
          minute:
            '2-digit'
        }
      )
    }

    return date.toLocaleDateString(
      'fr-FR',
      {
        day:
          '2-digit',
        month:
          '2-digit'
      }
    )
  }

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
               * UTILISATEUR EN FACE
               */
              const otherId =
                conv.seller_id ===
                user.id
                  ? conv.buyer_id
                  : conv.seller_id

              /*
               * PROFIL
               */
              const {
                data: profileData
              } = await supabase
                .from('profiles')
                .select(
                  'id, pseudo, avatar_url'
                )
                .eq(
                  'id',
                  otherId
                )
                .maybeSingle()

              /*
               * ANNONCE
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
               * MESSAGES NON LUS
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

              const isBlocked =
                blockedIds.includes(
                  otherId
                )

              return {
                ...conv,

                annonces:
                  annonceData ||
                  null,

                otherUser:
                  profileData || {
                    id:
                      otherId,
                    pseudo:
                      'Membre TrocTruc',
                    avatar_url:
                      null
                  },

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
                  null,

                lastMessageSenderId:
                  lastMessageData
                    ?.sender_id ||
                  null
              }
            }
          )
        )

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
    setActionMenuId(
      null
    )

    setActiveAnnonce(
      annonce || {
        id:
          'inconnue',
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

  async function handleDeleteConversation(
    e: React.MouseEvent,
    conversationId: string
  ) {
    e.stopPropagation()

    setActionMenuId(
      null
    )

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
      }
    }
  }

  async function handleBlockUser(
    e: React.MouseEvent,
    userIdToBlock: string
  ) {
    e.stopPropagation()

    setActionMenuId(
      null
    )

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
    }
  }

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

  /*
   * CHARGEMENT
   */
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
      {/* HEADER */}
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
                ? '#356f63'
                : '#e2e8f0',
            color:
              activeTab ===
              'conversations'
                ? '#ffffff'
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

                  const otherUser =
                    conv.otherUser || {
                      pseudo:
                        'Membre TrocTruc',
                      avatar_url:
                        null
                    }

                  const isUnread =
                    conv.hasUnread

                  const isBlocked =
                    conv.isBlocked

                  const lastMessageText =
                    conv.lastMessage
                      ? `${
                          conv.lastMessageSenderId ===
                          currentUser.id
                            ? 'Vous : '
                            : ''
                        }${conv.lastMessage}`
                      : `Avec ${
                          otherUser.pseudo ||
                          'Membre TrocTruc'
                        }`

                  return (
                    <li
                      key={
                        conv.id
                      }
                      style={{
                        marginBottom:
                          '10px'
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
                          gap:
                            '12px',
                          padding:
                            '12px 14px',
                          backgroundColor:
                            isBlocked
                              ? '#fff7ed'
                              : '#ffffff',
                          border:
                            isBlocked
                              ? '1px solid #fed7aa'
                              : isUnread
                                ? '1px solid #c8ddd7'
                                : '1px solid #e3e7eb',
                          borderRadius:
                            '11px',
                          cursor:
                            'pointer',
                          boxShadow:
                            '0 1px 3px rgba(15,23,42,0.04)',
                          transition:
                            'all 0.15s ease',
                          position:
                            'relative'
                        }}
                      >
                        {/* AVATAR */}
                        <div
                          style={{
                            width:
                              '44px',
                            height:
                              '44px',
                            borderRadius:
                              '50%',
                            overflow:
                              'visible',
                            flexShrink:
                              0,
                            position:
                              'relative'
                          }}
                        >
                          <div
                            style={{
                              width:
                                '44px',
                              height:
                                '44px',
                              borderRadius:
                                '50%',
                              overflow:
                                'hidden',
                              display:
                                'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'center',
                              backgroundColor:
                                '#eef2f4',
                              border:
                                '1px solid #d8dee3'
                            }}
                          >
                            {otherUser.avatar_url ? (
                              <img
                                src={
                                  otherUser.avatar_url
                                }
                                alt={
                                  otherUser.pseudo ||
                                  'Avatar'
                                }
                                style={{
                                  width:
                                    '100%',
                                  height:
                                    '100%',
                                  objectFit:
                                    'cover'
                                }}
                              />
                            ) : (
                              <span
                                style={{
                                  fontSize:
                                    '19px',
                                  color:
                                    '#64748b'
                                }}
                              >
                                👤
                              </span>
                            )}
                          </div>

                          {isUnread &&
                            !isBlocked && (
                              <span
                                style={{
                                  position:
                                    'absolute',
                                  bottom:
                                    '-1px',
                                  right:
                                    '-1px',
                                  width:
                                    '11px',
                                  height:
                                    '11px',
                                  borderRadius:
                                    '50%',
                                  backgroundColor:
                                    '#356f63',
                                  border:
                                    '2px solid #ffffff'
                                }}
                              />
                            )}
                        </div>

                        {/* CONTENU */}
                        <div
                          style={{
                            flex:
                              1,
                            minWidth:
                              0
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
                              gap:
                                '10px',
                              marginBottom:
                                '3px'
                            }}
                          >
                            <h3
                              style={{
                                margin:
                                  0,
                                fontSize:
                                  '14px',
                                color:
                                  '#263544',
                                fontWeight:
                                  isUnread
                                    ? '800'
                                    : '650',
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
                                  '10px',
                                color:
                                  isUnread
                                    ? '#356f63'
                                    : '#98a2ab',
                                fontWeight:
                                  isUnread
                                    ? '700'
                                    : '500',
                                whiteSpace:
                                  'nowrap',
                                flexShrink:
                                  0
                              }}
                            >
                              {formatMessageTime(
                                conv.lastMessageAt
                              )}
                            </span>
                          </div>

                          <div
                            style={{
                              display:
                                'flex',
                              alignItems:
                                'center',
                              gap:
                                '6px',
                              minWidth:
                                0
                            }}
                          >
                            {isUnread &&
                              !isBlocked && (
                                <span
                                  style={{
                                    width:
                                      '6px',
                                    height:
                                      '6px',
                                    borderRadius:
                                      '50%',
                                    backgroundColor:
                                      '#356f63',
                                    flexShrink:
                                      0
                                  }}
                                />
                              )}

                            <span
                              style={{
                                display:
                                  'block',
                                minWidth:
                                  0,
                                overflow:
                                  'hidden',
                                whiteSpace:
                                  'nowrap',
                                textOverflow:
                                  'ellipsis',
                                fontSize:
                                  '12px',
                                color:
                                  isBlocked
                                    ? '#c2410c'
                                    : isUnread
                                      ? '#43574f'
                                      : '#82909c',
                                fontWeight:
                                  isUnread
                                    ? '600'
                                    : '400'
                              }}
                            >
                              {isBlocked
                                ? `Utilisateur bloqué · ${
                                    otherUser.pseudo ||
                                    'Membre TrocTruc'
                                  }`
                                : lastMessageText}
                            </span>
                          </div>
                        </div>

                        {/* MENU */}
                        <div
                          style={{
                            position:
                              'relative',
                            alignSelf:
                              'center',
                            flexShrink:
                              0
                          }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()

                              setActionMenuId(
                                actionMenuId ===
                                  conv.id
                                  ? null
                                  : conv.id
                              )
                            }}
                            aria-label="Options de la conversation"
                            style={{
                              width:
                                '30px',
                              height:
                                '30px',
                              borderRadius:
                                '8px',
                              border:
                                'none',
                              backgroundColor:
                                actionMenuId ===
                                conv.id
                                  ? '#eef2f4'
                                  : 'transparent',
                              color:
                                '#64748b',
                              cursor:
                                'pointer',
                              fontSize:
                                '20px',
                              lineHeight:
                                '20px',
                              display:
                                'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'center'
                            }}
                          >
                            ⋯
                          </button>

                          {actionMenuId ===
                            conv.id && (
                            <div
                              onClick={(e) =>
                                e.stopPropagation()
                              }
                              style={{
                                position:
                                  'absolute',
                                top:
                                  '34px',
                                right:
                                  0,
                                width:
                                  '145px',
                                backgroundColor:
                                  '#ffffff',
                                border:
                                  '1px solid #dfe4e8',
                                borderRadius:
                                  '9px',
                                boxShadow:
                                  '0 8px 24px rgba(15,23,42,0.12)',
                                padding:
                                  '5px',
                                zIndex:
                                  20
                              }}
                            >
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleDeleteConversation(
                                    e,
                                    conv.id
                                  )
                                }
                                style={{
                                  width:
                                    '100%',
                                  border:
                                    'none',
                                  backgroundColor:
                                    'transparent',
                                  textAlign:
                                    'left',
                                  padding:
                                    '8px 9px',
                                  borderRadius:
                                    '6px',
                                  cursor:
                                    'pointer',
                                  color:
                                    '#475569',
                                  fontSize:
                                    '12px'
                                }}
                              >
                                🗑️ Supprimer
                              </button>

                              {!isBlocked && (
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleBlockUser(
                                      e,
                                      otherUserId
                                    )
                                  }
                                  style={{
                                    width:
                                      '100%',
                                    border:
                                      'none',
                                    backgroundColor:
                                      'transparent',
                                    textAlign:
                                      'left',
                                    padding:
                                      '8px 9px',
                                    borderRadius:
                                      '6px',
                                    cursor:
                                      'pointer',
                                    color:
                                      '#b42318',
                                    fontSize:
                                      '12px'
                                  }}
                                >
                                  🚫 Bloquer
                                </button>
                              )}
                            </div>
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