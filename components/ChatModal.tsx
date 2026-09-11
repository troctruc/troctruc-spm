'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface ChatModalProps {
  annonceId: string | number
  sellerId?: string
  currentUserId: string
  conversationId?: string | null
  onClose: () => void
  isBlocked?: boolean
}

export default function ChatModal({
  annonceId,
  sellerId,
  currentUserId,
  conversationId: initialConvId,
  onClose,
  isBlocked = false
}: ChatModalProps) {
  const router = useRouter()

  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [conversationId, setConversationId] =
    useState<string | null>(initialConvId || null)

  const [loading, setLoading] = useState(true)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [annonceTitle, setAnnonceTitle] =
    useState('Annonce')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const sortMessages = (list: any[]) => {
    return [...list].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()

      return dateA - dateB
    })
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function markMessagesAsRead(
    activeConversationId: string
  ) {
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('messages')
      .update({
        read_at: now
      })
      .eq(
        'conversation_id',
        activeConversationId
      )
      .neq(
        'sender_id',
        currentUserId
      )
      .is(
        'read_at',
        null
      )
      .select()

    if (error) {
      console.error(
        'Erreur marquage messages comme lus :',
        error
      )

      return
    }

    if (data && data.length > 0) {
      const updatedIds = new Set(
        data.map((msg) => msg.id)
      )

      setMessages((prev) =>
        prev.map((msg) =>
          updatedIds.has(msg.id)
            ? {
                ...msg,
                read_at: now
              }
            : msg
        )
      )
    }
  }

  useEffect(() => {
    let isMounted = true

    async function initChat() {
      if (!currentUserId) return

      setLoading(true)

      try {
        /*
         * TITRE DE L'ANNONCE
         */
        if (annonceId) {
          const {
            data: annonceData
          } = await supabase
            .from('annonces')
            .select('titre')
            .eq(
              'id',
              annonceId
            )
            .maybeSingle()

          if (
            isMounted &&
            annonceData?.titre
          ) {
            setAnnonceTitle(
              annonceData.titre
            )
          }
        }

        let activeConvId = initialConvId
        let interlocutorId: string | null = null

        /*
         * RECHERCHE OU CRÉATION
         * DE LA CONVERSATION
         */
        if (!activeConvId && annonceId) {
          const {
            data: existingConvs,
            error: searchError
          } = await supabase
            .from('conversations')
            .select('*')
            .eq(
              'annonce_id',
              annonceId
            )
            .or(
              `buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`
            )

          if (
            !searchError &&
            existingConvs &&
            existingConvs.length > 0
          ) {
            activeConvId =
              existingConvs[0].id

            const c =
              existingConvs[0]

            interlocutorId =
              c.buyer_id === currentUserId
                ? c.seller_id
                : c.buyer_id
          } else {
            const targetSellerId =
              sellerId &&
              sellerId !== currentUserId
                ? sellerId
                : currentUserId

            const {
              data: newConv,
              error: createError
            } = await supabase
              .from('conversations')
              .insert([
                {
                  annonce_id:
                    annonceId,
                  buyer_id:
                    currentUserId,
                  seller_id:
                    targetSellerId
                }
              ])
              .select()
              .single()

            if (
              !createError &&
              newConv
            ) {
              activeConvId =
                newConv.id

              interlocutorId =
                newConv.buyer_id ===
                currentUserId
                  ? newConv.seller_id
                  : newConv.buyer_id
            }
          }
        } else if (activeConvId) {
          const {
            data: currentConv
          } = await supabase
            .from('conversations')
            .select(
              'buyer_id, seller_id'
            )
            .eq(
              'id',
              activeConvId
            )
            .single()

          if (currentConv) {
            interlocutorId =
              currentConv.buyer_id ===
              currentUserId
                ? currentConv.seller_id
                : currentConv.buyer_id
          }
        }

        if (
          !interlocutorId &&
          sellerId &&
          sellerId !== currentUserId
        ) {
          interlocutorId =
            sellerId
        }

        /*
         * PROFIL DE L'INTERLOCUTEUR
         */
        if (
          interlocutorId &&
          isMounted
        ) {
          const {
            data: pData
          } = await supabase
            .from('profiles')
            .select(
              'id, pseudo, avatar_url'
            )
            .eq(
              'id',
              interlocutorId
            )
            .maybeSingle()

          if (pData) {
            setOtherUser(pData)
          } else {
            setOtherUser({
              id: interlocutorId,
              pseudo:
                'Membre TrocTruc'
            })
          }
        }

        /*
         * MESSAGES
         */
        if (
          activeConvId &&
          isMounted
        ) {
          setConversationId(
            activeConvId
          )

          const {
            data: msgs,
            error: msgError
          } = await supabase
            .from('messages')
            .select('*')
            .eq(
              'conversation_id',
              activeConvId
            )
            .order(
              'created_at',
              {
                ascending: true
              }
            )

          if (
            !msgError &&
            msgs
          ) {
            setMessages(
              sortMessages(msgs)
            )
          }

          await markMessagesAsRead(
            activeConvId
          )
        }
      } catch (err) {
        console.error(
          'Erreur initialisation chat:',
          err
        )
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initChat()

    return () => {
      isMounted = false
    }
  }, [
    annonceId,
    currentUserId,
    sellerId,
    initialConvId
  ])

  /*
   * TEMPS RÉEL
   */
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(
        `chat_${conversationId}`
      )

      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter:
            `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const incomingMessage =
            payload.new

          setMessages((prev) => {
            if (
              prev.some(
                (msg) =>
                  msg.id ===
                  incomingMessage.id
              )
            ) {
              return prev
            }

            return sortMessages([
              ...prev,
              incomingMessage
            ])
          })

          if (
            incomingMessage.sender_id !==
            currentUserId
          ) {
            await markMessagesAsRead(
              conversationId
            )
          }
        }
      )

      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter:
            `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const updatedMessage =
            payload.new

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id ===
              updatedMessage.id
                ? {
                    ...msg,
                    ...updatedMessage
                  }
                : msg
            )
          )
        }
      )

      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [
    conversationId,
    currentUserId
  ])

  async function sendMessage(
    e: React.FormEvent
  ) {
    e.preventDefault()

    if (isBlocked) {
      return
    }

    if (
      !newMessage.trim() ||
      !conversationId
    ) {
      return
    }

    const textToSend =
      newMessage.trim()

    setNewMessage('')

    const {
      data,
      error
    } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id:
            conversationId,
          sender_id:
            currentUserId,
          content:
            textToSend,
          read_at:
            null
        }
      ])
      .select()

    if (error) {
      alert(
        "Erreur d'envoi : " +
          error.message
      )

      setNewMessage(
        textToSend
      )

      return
    }

    if (
      data &&
      data.length > 0
    ) {
      setMessages((prev) => {
        if (
          prev.some(
            (msg) =>
              msg.id ===
              data[0].id
          )
        ) {
          return prev
        }

        return sortMessages([
          ...prev,
          data[0]
        ])
      })
    }

    /*
     * NOTIFICATION PUSH
     */
    try {
      const pushResponse =
        await fetch(
          '/api/send-push',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json'
            },
            body: JSON.stringify({
              conversation_id:
                conversationId,
              sender_id:
                currentUserId,
              content:
                textToSend
            })
          }
        )

      const pushResult =
        await pushResponse.json()

      if (!pushResponse.ok) {
        console.error(
          'Erreur API send-push :',
          pushResult
        )
      } else {
        console.log(
          'Notification push :',
          pushResult
        )
      }
    } catch (pushErr) {
      console.error(
        "Erreur lors de l'envoi de la notification push :",
        pushErr
      )
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        width:
          'min(380px, calc(100vw - 24px))',
        height: '500px',
        maxHeight:
          'calc(100vh - 32px)',
        backgroundColor:
          '#ffffff',
        borderRadius:
          '10px',
        display: 'flex',
        flexDirection:
          'column',
        overflow: 'hidden',
        boxShadow:
          '0 18px 45px rgba(15, 23, 42, 0.18)',
        zIndex: 2000,
        border:
          '1px solid #d8dee6',
        fontFamily:
          'system-ui, -apple-system, sans-serif'
      }}
    >
      {/* HEADER */}
      <div
        style={{
          backgroundColor:
            '#f3f4f6',
          color:
            '#24313f',
          padding:
            '11px 12px',
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems:
            'center',
          borderBottom:
            '1px solid #dde2e7'
        }}
      >
        <div
          onClick={() =>
            otherUser?.id &&
            router.push(
              `/profil/${otherUser.id}`
            )
          }
          style={{
            display: 'flex',
            alignItems:
              'center',
            gap: '10px',
            minWidth: 0,
            cursor:
              otherUser?.id
                ? 'pointer'
                : 'default'
          }}
          title={
            otherUser?.id
              ? 'Cliquer pour voir le profil'
              : ''
          }
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius:
                '8px',
              backgroundColor:
                '#ffffff',
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              overflow: 'hidden',
              flexShrink: 0,
              border:
                '1px solid #d2d8de'
            }}
          >
            {otherUser?.avatar_url ? (
              <img
                src={
                  otherUser.avatar_url
                }
                alt="Avatar"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit:
                    'cover'
                }}
              />
            ) : (
              <span
                style={{
                  fontSize:
                    '15px'
                }}
              >
                👤
              </span>
            )}
          </div>

          <h3
            style={{
              margin: 0,
              fontSize:
                '14px',
              fontWeight:
                '700',
              color:
                '#25313d',
              whiteSpace:
                'nowrap',
              overflow:
                'hidden',
              textOverflow:
                'ellipsis',
              maxWidth:
                '230px'
            }}
          >
            {otherUser?.pseudo ||
              'Discussion'}
          </h3>
        </div>

        <button
          onClick={onClose}
          aria-label="Fermer la conversation"
          style={{
            background:
              '#ffffff',
            border:
              '1px solid #d8dde2',
            color:
              '#65717c',
            fontSize:
              '15px',
            cursor:
              'pointer',
            width:
              '30px',
            height:
              '30px',
            borderRadius:
              '7px',
            display:
              'flex',
            alignItems:
              'center',
            justifyContent:
              'center',
            padding: 0,
            flexShrink: 0
          }}
        >
          ✕
        </button>
      </div>

      {/* TITRE DE L'ANNONCE */}
      <div
        style={{
          padding:
            '9px 13px',
          backgroundColor:
            '#fafafa',
          borderBottom:
            '1px solid #e6e9ec'
        }}
      >
        <div
          style={{
            fontSize:
              '10px',
            color:
              '#8a949e',
            marginBottom:
              '2px'
          }}
        >
          Annonce
        </div>

        <div
          style={{
            fontSize:
              '12px',
            fontWeight:
              '700',
            color:
              '#35414d',
            whiteSpace:
              'nowrap',
            overflow:
              'hidden',
            textOverflow:
              'ellipsis'
          }}
        >
          {annonceTitle}
        </div>
      </div>

      {/* MESSAGE UTILISATEUR BLOQUÉ */}
      {isBlocked && (
        <div
          style={{
            padding:
              '8px 12px',
            backgroundColor:
              '#fff7ed',
            color:
              '#9a3412',
            fontSize:
              '11px',
            textAlign:
              'center',
            borderBottom:
              '1px solid #fed7aa',
            fontWeight:
              '600'
          }}
        >
          🚫 Utilisateur bloqué — historique consultable, envoi désactivé
        </div>
      )}

      {/* MESSAGES */}
      <div
        style={{
          flex: 1,
          padding:
            '16px 14px',
          overflowY:
            'auto',
          display:
            'flex',
          flexDirection:
            'column',
          gap:
            '12px',
          backgroundColor:
            '#fbfbfa'
        }}
      >
        {loading ? (
          <p
            style={{
              textAlign:
                'center',
              color:
                '#8a949d',
              fontSize:
                '13px',
              marginTop:
                '20px'
            }}
          >
            Chargement...
          </p>
        ) : messages.length === 0 ? (
          <div
            style={{
              textAlign:
                'center',
              margin:
                '28px auto 0',
              maxWidth:
                '250px',
              color:
                '#76818a'
            }}
          >
            <div
              style={{
                fontSize:
                  '22px',
                marginBottom:
                  '8px'
              }}
            >
              ✉️
            </div>

            <p
              style={{
                margin: 0,
                fontSize:
                  '13px',
                lineHeight:
                  '1.45'
              }}
            >
              Aucun message pour l’instant.
              <br />
              Vous pouvez démarrer l’échange ici.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe =
              msg.sender_id ===
              currentUserId

            return (
              <div
                key={msg.id}
                style={{
                  display:
                    'flex',
                  flexDirection:
                    'column',
                  alignSelf:
                    isMe
                      ? 'flex-end'
                      : 'flex-start',
                  maxWidth:
                    '82%'
                }}
              >
                {!isMe &&
                  otherUser?.pseudo && (
                    <span
                      style={{
                        fontSize:
                          '10px',
                        color:
                          '#7b8790',
                        marginBottom:
                          '4px',
                        fontWeight:
                          '600'
                      }}
                    >
                      {
                        otherUser.pseudo
                      }
                    </span>
                  )}

                <div
                  style={{
                    backgroundColor:
                      isMe
                        ? '#e7f0ed'
                        : '#ffffff',
                    color:
                      '#26323d',
                    padding:
                      '9px 11px',
                    borderRadius:
                      '8px',
                    fontSize:
                      '13px',
                    lineHeight:
                      '1.45',
                    border:
                      isMe
                        ? '1px solid #c7d9d4'
                        : '1px solid #dfe4e8',
                    boxShadow:
                      '0 1px 2px rgba(15, 23, 42, 0.04)',
                    wordBreak:
                      'break-word'
                  }}
                >
                  {msg.content}
                </div>

                <span
                  style={{
                    fontSize:
                      '9px',
                    color:
                      '#8b949d',
                    marginTop:
                      '3px',
                    display:
                      'block',
                    textAlign:
                      isMe
                        ? 'right'
                        : 'left'
                  }}
                >
                  {new Date(
                    msg.created_at
                  ).toLocaleTimeString(
                    [],
                    {
                      hour:
                        '2-digit',
                      minute:
                        '2-digit'
                    }
                  )}

                  {isMe && (
                    <>
                      {' · '}
                      {msg.read_at
                        ? 'Lu'
                        : 'Envoyé'}
                    </>
                  )}
                </span>
              </div>
            )
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ENVOI */}
      <form
        onSubmit={sendMessage}
        style={{
          padding:
            '10px',
          borderTop:
            '1px solid #e1e5e9',
          display:
            'flex',
          gap:
            '8px',
          backgroundColor:
            '#ffffff'
        }}
      >
        <input
          type="text"
          placeholder={
            isBlocked
              ? 'Utilisateur bloqué'
              : 'Écrire un message...'
          }
          value={newMessage}
          disabled={isBlocked}
          onChange={(e) =>
            setNewMessage(
              e.target.value
            )
          }
          style={{
            flex: 1,
            padding:
              '9px 11px',
            borderRadius:
              '7px',
            border:
              '1px solid #cfd6dc',
            outline:
              'none',
            fontSize:
              '13px',
            backgroundColor:
              isBlocked
                ? '#f1f5f9'
                : '#ffffff',
            color:
              '#24313f',
            cursor:
              isBlocked
                ? 'not-allowed'
                : 'text'
          }}
        />

        <button
          type="submit"
          disabled={
            isBlocked ||
            !newMessage.trim()
          }
          style={{
            backgroundColor:
              '#2f6b5f',
            color:
              'white',
            border:
              'none',
            padding:
              '9px 13px',
            borderRadius:
              '7px',
            fontWeight:
              '700',
            fontSize:
              '12px',
            cursor:
              !isBlocked &&
              newMessage.trim()
                ? 'pointer'
                : 'default',
            opacity:
              !isBlocked &&
              newMessage.trim()
                ? 1
                : 0.4
          }}
        >
          Envoyer
        </button>
      </form>
    </div>
  )
}