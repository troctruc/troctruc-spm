'use client'

import {
  useEffect,
  useRef,
  useState,
} from 'react'

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
  isBlocked = false,
}: ChatModalProps) {
  const router = useRouter()

  const [messages, setMessages] = useState<any[]>([])

  const [newMessage, setNewMessage] =
    useState('')

  const [conversationId, setConversationId] =
    useState<string | null>(
      initialConvId || null
    )

  const [loading, setLoading] =
    useState(true)

  const [sending, setSending] =
    useState(false)

  const [otherUser, setOtherUser] =
    useState<any>(null)

  const [annonceTitle, setAnnonceTitle] =
    useState('Annonce')

  const [
    selectedAttachment,
    setSelectedAttachment,
  ] =
    useState<File | null>(null)

  const [
    selectedPreview,
    setSelectedPreview,
  ] =
    useState<string | null>(null)

  const [
    signedAttachmentUrls,
    setSignedAttachmentUrls,
  ] =
    useState<Record<string, string>>({})

  const [
    enlargedImage,
    setEnlargedImage,
  ] =
    useState<string | null>(null)

  const messagesEndRef =
    useRef<HTMLDivElement>(null)

  const fileInputRef =
    useRef<HTMLInputElement>(null)

  const sortMessages = (
    list: any[]
  ) => {
    return [...list].sort(
      (a, b) => {
        const dateA =
          new Date(
            a.created_at
          ).getTime()

        const dateB =
          new Date(
            b.created_at
          ).getTime()

        return dateA - dateB
      }
    )
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: 'smooth',
      }
    )
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  /*
   * URLS PRIVÉES DES PIÈCES JOINTES
   */

  async function loadSignedUrl(
    path: string
  ) {
    if (
      !path ||
      signedAttachmentUrls[path]
    ) {
      return
    }

    const {
      data,
      error,
    } = await supabase.storage
      .from('chat-attachments')
      .createSignedUrl(
        path,
        60 * 60
      )

    if (error) {
      console.error(
        'Erreur URL pièce jointe :',
        error
      )

      return
    }

    if (data?.signedUrl) {
      setSignedAttachmentUrls(
        (prev) => ({
          ...prev,
          [path]:
            data.signedUrl,
        })
      )
    }
  }

  useEffect(() => {
    messages.forEach(
      (message) => {
        if (
          message.attachment_path
        ) {
          loadSignedUrl(
            message.attachment_path
          )
        }
      }
    )
  }, [messages])

  /*
   * MESSAGES LUS
   */

  async function markMessagesAsRead(
    activeConversationId: string
  ) {
    const now =
      new Date().toISOString()

    const {
      data,
      error,
    } = await supabase
      .from('messages')
      .update({
        read_at: now,
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

    if (
      data &&
      data.length > 0
    ) {
      const updatedIds =
        new Set(
          data.map(
            (msg) =>
              msg.id
          )
        )

      setMessages(
        (prev) =>
          prev.map(
            (msg) =>
              updatedIds.has(
                msg.id
              )
                ? {
                    ...msg,
                    read_at:
                      now,
                  }
                : msg
          )
      )
    }
  }

  /*
   * INITIALISATION CHAT
   */

  useEffect(() => {
    let isMounted = true

    async function initChat() {
      if (
        !currentUserId
      ) {
        return
      }

      setLoading(true)

      try {
        /*
         * TITRE DE L'ANNONCE
         */

        if (annonceId) {
          const {
            data:
              annonceData,
          } =
            await supabase
              .from(
                'annonces'
              )
              .select(
                'titre'
              )
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

        let activeConvId =
          initialConvId

        let interlocutorId:
          | string
          | null = null

        /*
         * RECHERCHE OU CRÉATION CONVERSATION
         */

        if (
          !activeConvId &&
          annonceId
        ) {
          const {
            data:
              existingConvs,
            error:
              searchError,
          } =
            await supabase
              .from(
                'conversations'
              )
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
            existingConvs.length >
              0
          ) {
            activeConvId =
              existingConvs[0]
                .id

            const c =
              existingConvs[0]

            interlocutorId =
              c.buyer_id ===
              currentUserId
                ? c.seller_id
                : c.buyer_id
          } else {
            const targetSellerId =
              sellerId &&
              sellerId !==
                currentUserId
                ? sellerId
                : currentUserId

            const {
              data:
                newConv,
              error:
                createError,
            } =
              await supabase
                .from(
                  'conversations'
                )
                .insert([
                  {
                    annonce_id:
                      annonceId,

                    buyer_id:
                      currentUserId,

                    seller_id:
                      targetSellerId,
                  },
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
        } else if (
          activeConvId
        ) {
          const {
            data:
              currentConv,
          } =
            await supabase
              .from(
                'conversations'
              )
              .select(
                'buyer_id, seller_id'
              )
              .eq(
                'id',
                activeConvId
              )
              .single()

          if (
            currentConv
          ) {
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
          sellerId !==
            currentUserId
        ) {
          interlocutorId =
            sellerId
        }

        /*
         * PROFIL DE L'AUTRE UTILISATEUR
         */

        if (
          interlocutorId &&
          isMounted
        ) {
          const {
            data: pData,
          } =
            await supabase
              .from(
                'profiles'
              )
              .select(
                'id, pseudo, avatar_url'
              )
              .eq(
                'id',
                interlocutorId
              )
              .maybeSingle()

          if (pData) {
            setOtherUser(
              pData
            )
          } else {
            setOtherUser({
              id:
                interlocutorId,

              pseudo:
                'Membre TrocTruc',
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
            error:
              msgError,
          } =
            await supabase
              .from(
                'messages'
              )
              .select('*')
              .eq(
                'conversation_id',
                activeConvId
              )
              .order(
                'created_at',
                {
                  ascending:
                    true,
                }
              )

          if (
            !msgError &&
            msgs
          ) {
            setMessages(
              sortMessages(
                msgs
              )
            )
          }

          await markMessagesAsRead(
            activeConvId
          )
        }
      } catch (err) {
        console.error(
          'Erreur initialisation chat :',
          err
        )
      } finally {
        if (
          isMounted
        ) {
          setLoading(
            false
          )
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
    initialConvId,
  ])

  /*
   * TEMPS RÉEL
   */

  useEffect(() => {
    if (
      !conversationId
    ) {
      return
    }

    const channel =
      supabase
        .channel(
          `chat_${conversationId}`
        )
        .on(
          'postgres_changes',
          {
            event:
              'INSERT',

            schema:
              'public',

            table:
              'messages',

            filter:
              `conversation_id=eq.${conversationId}`,
          },
          async (
            payload
          ) => {
            const incomingMessage =
              payload.new

            setMessages(
              (prev) => {
                if (
                  prev.some(
                    (msg) =>
                      msg.id ===
                      incomingMessage.id
                  )
                ) {
                  return prev
                }

                return sortMessages(
                  [
                    ...prev,
                    incomingMessage,
                  ]
                )
              }
            )

            if (
              incomingMessage.attachment_path
            ) {
              await loadSignedUrl(
                incomingMessage.attachment_path
              )
            }

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
            event:
              'UPDATE',

            schema:
              'public',

            table:
              'messages',

            filter:
              `conversation_id=eq.${conversationId}`,
          },
          (
            payload
          ) => {
            const updatedMessage =
              payload.new

            setMessages(
              (prev) =>
                prev.map(
                  (msg) =>
                    msg.id ===
                    updatedMessage.id
                      ? {
                          ...msg,
                          ...updatedMessage,
                        }
                      : msg
                )
            )
          }
        )
        .subscribe()

    return () => {
      supabase.removeChannel(
        channel
      )
    }
  }, [
    conversationId,
    currentUserId,
  ])

  /*
   * CHOIX PIÈCE JOINTE
   */

  function handleAttachmentChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0]

    if (!file) {
      return
    }

    /*
     * Pour l'instant :
     * images seulement.
     */

    if (
      !file.type.startsWith(
        'image/'
      )
    ) {
      alert(
        'Pour le moment, vous pouvez joindre uniquement des photos.'
      )

      event.target.value =
        ''

      return
    }

    /*
     * Maximum 8 Mo
     */

    const maxSize =
      8 * 1024 * 1024

    if (
      file.size >
      maxSize
    ) {
      alert(
        'La photo est trop lourde. Taille maximale : 8 Mo.'
      )

      event.target.value =
        ''

      return
    }

    setSelectedAttachment(
      file
    )

    const preview =
      URL.createObjectURL(
        file
      )

    if (
      selectedPreview
    ) {
      URL.revokeObjectURL(
        selectedPreview
      )
    }

    setSelectedPreview(
      preview
    )
  }

  function removeSelectedAttachment() {
    if (
      selectedPreview
    ) {
      URL.revokeObjectURL(
        selectedPreview
      )
    }

    setSelectedAttachment(
      null
    )

    setSelectedPreview(
      null
    )

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        ''
    }
  }

  /*
   * NOM FICHIER SÉCURISÉ
   */

  function sanitizeFileName(
    name: string
  ) {
    return name
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .replace(
        /[^a-zA-Z0-9._-]/g,
        '_'
      )
  }

  /*
   * ENVOI MESSAGE
   */

  async function sendMessage(
    e: React.FormEvent
  ) {
    e.preventDefault()

    if (
      isBlocked ||
      sending
    ) {
      return
    }

    if (
      !conversationId
    ) {
      return
    }

    const textToSend =
      newMessage.trim()

    /*
     * Autoriser :
     * - texte seul
     * - photo seule
     * - texte + photo
     */

    if (
      !textToSend &&
      !selectedAttachment
    ) {
      return
    }

    setSending(true)

    let attachmentPath:
      | string
      | null = null

    let attachmentName:
      | string
      | null = null

    let attachmentType:
      | string
      | null = null

    /*
     * UPLOAD PHOTO
     */

    if (
      selectedAttachment
    ) {
      const cleanName =
        sanitizeFileName(
          selectedAttachment.name
        )

      const uniqueName =
        `${Date.now()}-${crypto.randomUUID()}-${cleanName}`

      attachmentPath =
        `${conversationId}/${uniqueName}`

      attachmentName =
        selectedAttachment.name

      attachmentType =
        selectedAttachment.type

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            'chat-attachments'
          )
          .upload(
            attachmentPath,
            selectedAttachment,
            {
              cacheControl:
                '3600',

              upsert:
                false,

              contentType:
                selectedAttachment.type,
            }
          )

      if (
        uploadError
      ) {
        console.error(
          'Erreur upload photo :',
          uploadError
        )

        alert(
          "Impossible d'envoyer la photo : " +
            uploadError.message
        )

        setSending(
          false
        )

        return
      }
    }

    /*
     * INSERT MESSAGE
     */

    const {
      data,
      error,
    } =
      await supabase
        .from(
          'messages'
        )
        .insert([
          {
            conversation_id:
              conversationId,

            sender_id:
              currentUserId,

            /*
             * Une chaîne vide permet d'envoyer
             * une photo sans texte.
             */

            content:
              textToSend,

            read_at:
              null,

            attachment_path:
              attachmentPath,

            attachment_name:
              attachmentName,

            attachment_type:
              attachmentType,
          },
        ])
        .select()

    if (
      error
    ) {
      console.error(
        "Erreur d'envoi du message :",
        error
      )

      /*
       * Si l'upload a réussi mais pas le message,
       * on retire le fichier orphelin.
       */

      if (
        attachmentPath
      ) {
        await supabase.storage
          .from(
            'chat-attachments'
          )
          .remove([
            attachmentPath,
          ])
      }

      alert(
        "Erreur d'envoi : " +
          error.message
      )

      setSending(
        false
      )

      return
    }

    /*
     * AJOUT LOCAL IMMÉDIAT
     */

    if (
      data &&
      data.length > 0
    ) {
      setMessages(
        (prev) => {
          if (
            prev.some(
              (msg) =>
                msg.id ===
                data[0].id
            )
          ) {
            return prev
          }

          return sortMessages(
            [
              ...prev,
              data[0],
            ]
          )
        }
      )

      if (
        data[0]
          .attachment_path
      ) {
        await loadSignedUrl(
          data[0]
            .attachment_path
        )
      }
    }

    /*
     * On vide la zone d'envoi
     */

    setNewMessage('')

    removeSelectedAttachment()

    setSending(false)

    /*
     * NOTIFICATION PUSH
     */

    try {
      const pushContent =
        textToSend ||
        '📷 Photo'

      const pushResponse =
        await fetch(
          '/api/send-push',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                conversation_id:
                  conversationId,

                sender_id:
                  currentUserId,

                content:
                  pushContent,
              }),
          }
        )

      const pushResult =
        await pushResponse.json()

      if (
        !pushResponse.ok
      ) {
        console.error(
          'Erreur API send-push :',
          pushResult
        )
      }
    } catch (
      pushErr
    ) {
      console.error(
        "Erreur lors de l'envoi de la notification push :",
        pushErr
      )
    }
  }

  /*
   * NETTOYAGE PREVIEW LOCAL
   */

  useEffect(() => {
    return () => {
      if (
        selectedPreview
      ) {
        URL.revokeObjectURL(
          selectedPreview
        )
      }
    }
  }, [
    selectedPreview,
  ])

  return (
    <>
      <div
        style={{
          position:
            'fixed',

          bottom:
            '16px',

          right:
            '16px',

          width:
            'min(405px, calc(100vw - 24px))',

          height:
            '560px',

          maxHeight:
            'calc(100vh - 32px)',

          backgroundColor:
            '#ffffff',

          borderRadius:
            '14px',

          display:
            'flex',

          flexDirection:
            'column',

          overflow:
            'hidden',

          boxShadow:
            '0 18px 50px rgba(15, 23, 42, 0.17)',

          zIndex:
            2000,

          border:
            '1px solid #d7dce0',

          fontFamily:
            'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* HEADER */}

        <div
          style={{
            backgroundColor:
              '#356f63',

            padding:
              '13px 14px',

            display:
              'flex',

            justifyContent:
              'space-between',

            alignItems:
              'center',

            borderBottom:
              '1px solid #2f6258',
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
              display:
                'flex',

              alignItems:
                'center',

              gap:
                '10px',

              minWidth:
                0,

              cursor:
                otherUser?.id
                  ? 'pointer'
                  : 'default',
            }}
            title={
              otherUser?.id
                ? 'Voir le profil'
                : ''
            }
          >
            <div
              style={{
                width:
                  '38px',

                height:
                  '38px',

                borderRadius:
                  '10px',

                backgroundColor:
                  '#ffffff',

                display:
                  'flex',

                alignItems:
                  'center',

                justifyContent:
                  'center',

                overflow:
                  'hidden',

                flexShrink:
                  0,

                border:
                  '1px solid rgba(255,255,255,0.65)',
              }}
            >
              {otherUser?.avatar_url ? (
                <img
                  src={
                    otherUser.avatar_url
                  }
                  alt="Avatar"
                  style={{
                    width:
                      '100%',

                    height:
                      '100%',

                    objectFit:
                      'cover',
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize:
                      '16px',
                  }}
                >
                  👤
                </span>
              )}
            </div>

            <h3
              style={{
                margin:
                  0,

                fontSize:
                  '14px',

                fontWeight:
                  '700',

                color:
                  '#ffffff',

                whiteSpace:
                  'nowrap',

                overflow:
                  'hidden',

                textOverflow:
                  'ellipsis',

                maxWidth:
                  '255px',
              }}
            >
              {otherUser?.pseudo ||
                'Discussion'}
            </h3>
          </div>

          <button
            onClick={
              onClose
            }
            aria-label="Fermer la conversation"
            style={{
              background:
                'rgba(255,255,255,0.14)',

              border:
                '1px solid rgba(255,255,255,0.45)',

              color:
                '#ffffff',

              width:
                '30px',

              height:
                '30px',

              borderRadius:
                '8px',

              fontSize:
                '14px',

              cursor:
                'pointer',

              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'center',

              padding:
                0,

              flexShrink:
                0,
            }}
          >
            ✕
          </button>
        </div>

        {/* ANNONCE */}

        <button
          type="button"
          onClick={() =>
            router.push(
              `/annonces/${annonceId}`
            )
          }
          style={{
            border:
              'none',

            borderBottom:
              '1px solid #cbd1d6',

            backgroundColor:
              '#dfe3e6',

            padding:
              '10px 14px',

            textAlign:
              'left',

            cursor:
              'pointer',

            width:
              '100%',
          }}
        >
          <span
            style={{
              fontSize:
                '11px',

              fontWeight:
                '700',

              color:
                '#2f3a43',
            }}
          >
            {annonceTitle}
          </span>
        </button>

        {/* BLOQUÉ */}

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
                '600',
            }}
          >
            🚫 Utilisateur bloqué — historique consultable
          </div>
        )}

        {/* MESSAGES */}

        <div
          style={{
            flex:
              1,

            padding:
              '17px 14px',

            overflowY:
              'auto',

            display:
              'flex',

            flexDirection:
              'column',

            gap:
              '13px',

            backgroundColor:
              '#fbfbfa',
          }}
        >
          {loading ? (
            <p
              style={{
                textAlign:
                  'center',

                color:
                  '#8d969e',

                fontSize:
                  '12px',

                marginTop:
                  '20px',
              }}
            >
              Chargement...
            </p>
          ) : messages.length ===
            0 ? (
            <div
              style={{
                textAlign:
                  'center',

                margin:
                  '32px auto 0',

                maxWidth:
                  '260px',

                color:
                  '#76818a',
              }}
            >
              <div
                style={{
                  fontSize:
                    '22px',

                  marginBottom:
                    '8px',
                }}
              >
                ✉️
              </div>

              <p
                style={{
                  margin:
                    0,

                  fontSize:
                    '13px',

                  lineHeight:
                    '1.45',
                }}
              >
                Aucun message pour l’instant.
                <br />
                Vous pouvez démarrer l’échange ici.
              </p>
            </div>
          ) : (
            messages.map(
              (msg) => {
                const isMe =
                  msg.sender_id ===
                  currentUserId

                const attachmentUrl =
                  msg.attachment_path
                    ? signedAttachmentUrls[
                        msg
                          .attachment_path
                      ]
                    : null

                const isImage =
                  msg.attachment_type?.startsWith(
                    'image/'
                  )

                return (
                  <div
                    key={
                      msg.id
                    }
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
                        '82%',
                    }}
                  >
                    {!isMe &&
                      otherUser?.pseudo && (
                        <span
                          style={{
                            fontSize:
                              '10px',

                            color:
                              '#7a848d',

                            marginBottom:
                              '4px',

                            fontWeight:
                              '600',
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
                            ? '#edf4f1'
                            : '#ffffff',

                        color:
                          '#27323b',

                        padding:
                          msg.attachment_path
                            ? '6px'
                            : '9px 11px',

                        borderRadius:
                          '8px',

                        fontSize:
                          '13px',

                        lineHeight:
                          '1.45',

                        border:
                          isMe
                            ? '1px solid #d0ded8'
                            : '1px solid #e0e4e7',

                        boxShadow:
                          '0 1px 2px rgba(15, 23, 42, 0.03)',

                        wordBreak:
                          'break-word',
                      }}
                    >
                      {/* PHOTO */}

                      {msg.attachment_path &&
                        isImage &&
                        attachmentUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setEnlargedImage(
                                attachmentUrl
                              )
                            }
                            style={{
                              padding:
                                0,

                              margin:
                                0,

                              display:
                                'block',

                              border:
                                'none',

                              background:
                                'transparent',

                              cursor:
                                'zoom-in',

                              width:
                                '100%',
                            }}
                          >
                            <img
                              src={
                                attachmentUrl
                              }
                              alt={
                                msg.attachment_name ||
                                'Photo'
                              }
                              style={{
                                display:
                                  'block',

                                width:
                                  '100%',

                                maxWidth:
                                  '270px',

                                maxHeight:
                                  '280px',

                                objectFit:
                                  'cover',

                                borderRadius:
                                  '6px',
                              }}
                            />
                          </button>
                        )}

                      {/* CHARGEMENT PHOTO */}

                      {msg.attachment_path &&
                        isImage &&
                        !attachmentUrl && (
                          <div
                            style={{
                              padding:
                                '15px',

                              minWidth:
                                '150px',

                              textAlign:
                                'center',

                              color:
                                '#7a848d',

                              fontSize:
                                '11px',
                            }}
                          >
                            📷 Chargement de la photo...
                          </div>
                        )}

                      {/* TEXTE */}

                      {msg.content && (
                        <div
                          style={{
                            padding:
                              msg.attachment_path
                                ? '7px 5px 3px'
                                : 0,

                            whiteSpace:
                              'pre-wrap',
                          }}
                        >
                          {
                            msg.content
                          }
                        </div>
                      )}
                    </div>

                    <span
                      style={{
                        fontSize:
                          '9px',

                        color:
                          '#9aa2a8',

                        marginTop:
                          '3px',

                        display:
                          'block',

                        textAlign:
                          isMe
                            ? 'right'
                            : 'left',
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
                            '2-digit',
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
              }
            )
          )}

          <div
            ref={
              messagesEndRef
            }
          />
        </div>

        {/* APERÇU PHOTO AVANT ENVOI */}

        {selectedPreview && (
          <div
            style={{
              padding:
                '8px 11px',

              borderTop:
                '1px solid #e2e5e8',

              backgroundColor:
                '#f8fafc',

              display:
                'flex',

              alignItems:
                'center',

              gap:
                '9px',
            }}
          >
            <div
              style={{
                position:
                  'relative',

                width:
                  '62px',

                height:
                  '62px',
              }}
            >
              <img
                src={
                  selectedPreview
                }
                alt="Photo à envoyer"
                style={{
                  width:
                    '62px',

                  height:
                    '62px',

                  objectFit:
                    'cover',

                  borderRadius:
                    '8px',

                  border:
                    '1px solid #d7dde2',
                }}
              />

              <button
                type="button"
                onClick={
                  removeSelectedAttachment
                }
                style={{
                  position:
                    'absolute',

                  top:
                    '-6px',

                  right:
                    '-6px',

                  width:
                    '21px',

                  height:
                    '21px',

                  borderRadius:
                    '50%',

                  border:
                    'none',

                  backgroundColor:
                    '#dc2626',

                  color:
                    '#ffffff',

                  cursor:
                    'pointer',

                  fontSize:
                    '12px',

                  lineHeight:
                    '21px',

                  padding:
                    0,
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                minWidth:
                  0,

                flex:
                  1,
              }}
            >
              <div
                style={{
                  fontSize:
                    '11px',

                  fontWeight:
                    '700',

                  color:
                    '#475569',

                  overflow:
                    'hidden',

                  textOverflow:
                    'ellipsis',

                  whiteSpace:
                    'nowrap',
                }}
              >
                {
                  selectedAttachment?.name
                }
              </div>

              <div
                style={{
                  marginTop:
                    '3px',

                  fontSize:
                    '10px',

                  color:
                    '#94a3b8',
                }}
              >
                Photo prête à être envoyée
              </div>
            </div>
          </div>
        )}

        {/* ENVOI */}

        <form
          onSubmit={
            sendMessage
          }
          style={{
            padding:
              '11px',

            borderTop:
              '1px solid #e2e5e8',

            display:
              'flex',

            gap:
              '7px',

            backgroundColor:
              '#ffffff',

            alignItems:
              'center',
          }}
        >
          {/* INPUT FICHIER INVISIBLE */}

          <input
            ref={
              fileInputRef
            }
            type="file"
            accept="image/*"
            onChange={
              handleAttachmentChange
            }
            disabled={
              isBlocked ||
              sending
            }
            style={{
              display:
                'none',
            }}
          />

          {/* BOUTON PHOTO */}

          <button
            type="button"
            title="Ajouter une photo"
            disabled={
              isBlocked ||
              sending
            }
            onClick={() =>
              fileInputRef.current?.click()
            }
            style={{
              width:
                '39px',

              height:
                '39px',

              flexShrink:
                0,

              borderRadius:
                '8px',

              border:
                '1px solid #d1d7dc',

              backgroundColor:
                '#f8fafc',

              color:
                '#356f63',

              fontSize:
                '18px',

              cursor:
                isBlocked ||
                sending
                  ? 'default'
                  : 'pointer',

              opacity:
                isBlocked
                  ? 0.4
                  : 1,
            }}
          >
            📎
          </button>

          {/* TEXTE */}

          <input
            type="text"
            placeholder={
              isBlocked
                ? 'Utilisateur bloqué'
                : selectedAttachment
                  ? 'Ajouter un message...'
                  : 'Écrire un message...'
            }
            value={
              newMessage
            }
            disabled={
              isBlocked ||
              sending
            }
            onChange={(
              e
            ) =>
              setNewMessage(
                e.target.value
              )
            }
            style={{
              flex:
                1,

              minWidth:
                0,

              padding:
                '10px 11px',

              borderRadius:
                '8px',

              border:
                '1px solid #d1d7dc',

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
                  : 'text',
            }}
          />

          {/* ENVOYER */}

          <button
            type="submit"
            disabled={
              isBlocked ||
              sending ||
              (!newMessage.trim() &&
                !selectedAttachment)
            }
            style={{
              backgroundColor:
                '#356f63',

              color:
                '#ffffff',

              border:
                'none',

              padding:
                '9px 12px',

              height:
                '39px',

              borderRadius:
                '8px',

              fontWeight:
                '700',

              fontSize:
                '12px',

              cursor:
                !isBlocked &&
                !sending &&
                (newMessage.trim() ||
                  selectedAttachment)
                  ? 'pointer'
                  : 'default',

              opacity:
                !isBlocked &&
                !sending &&
                (newMessage.trim() ||
                  selectedAttachment)
                  ? 1
                  : 0.4,

              whiteSpace:
                'nowrap',
            }}
          >
            {sending
              ? '...'
              : 'Envoyer'}
          </button>
        </form>
      </div>

      {/* AGRANDISSEMENT PHOTO */}

      {enlargedImage && (
        <div
          onClick={() =>
            setEnlargedImage(
              null
            )
          }
          style={{
            position:
              'fixed',

            inset:
              0,

            backgroundColor:
              'rgba(0,0,0,0.82)',

            zIndex:
              5000,

            display:
              'flex',

            alignItems:
              'center',

            justifyContent:
              'center',

            padding:
              '20px',

            cursor:
              'zoom-out',
          }}
        >
          <button
            type="button"
            onClick={() =>
              setEnlargedImage(
                null
              )
            }
            style={{
              position:
                'absolute',

              top:
                '18px',

              right:
                '18px',

              width:
                '38px',

              height:
                '38px',

              borderRadius:
                '50%',

              border:
                '1px solid rgba(255,255,255,0.6)',

              backgroundColor:
                'rgba(0,0,0,0.35)',

              color:
                '#ffffff',

              cursor:
                'pointer',

              fontSize:
                '18px',
            }}
          >
            ✕
          </button>

          <img
            src={
              enlargedImage
            }
            alt="Photo agrandie"
            onClick={(
              e
            ) =>
              e.stopPropagation()
            }
            style={{
              maxWidth:
                '95vw',

              maxHeight:
                '90vh',

              objectFit:
                'contain',

              borderRadius:
                '10px',

              cursor:
                'default',
            }}
          />
        </div>
      )}
    </>
  )
}