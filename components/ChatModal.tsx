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
}

export default function ChatModal({ annonceId, sellerId, currentUserId, conversationId: initialConvId, onClose }: ChatModalProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(initialConvId || null)
  const [loading, setLoading] = useState(true)
  const [otherUser, setOtherUser] = useState<any>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialisation de la conversation, des messages et du profil de l'interlocuteur
  useEffect(() => {
    let isMounted = true

    async function initChat() {
      if (!currentUserId) return
      setLoading(true)

      try {
        let activeConvId = initialConvId
        let interlocutorId: string | null = null

        // 1. Recherche ou création de la conversation
        if (!activeConvId && annonceId) {
          const { data: existingConvs, error: searchError } = await supabase
            .from('conversations')
            .select('*')
            .eq('annonce_id', annonceId)
            .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)

          if (!searchError && existingConvs && existingConvs.length > 0) {
            activeConvId = existingConvs[0].id
            const c = existingConvs[0]
            interlocutorId = c.buyer_id === currentUserId ? c.seller_id : c.buyer_id
          } else {
            const targetSellerId = (sellerId && sellerId !== currentUserId) ? sellerId : currentUserId
            const { data: newConv, error: createError } = await supabase
              .from('conversations')
              .insert([
                {
                  annonce_id: annonceId,
                  buyer_id: currentUserId,
                  seller_id: targetSellerId
                }
              ])
              .select()
              .single()

            if (!createError && newConv) {
              activeConvId = newConv.id
              interlocutorId = newConv.buyer_id === currentUserId ? newConv.seller_id : newConv.buyer_id
            }
          }
        } else if (activeConvId) {
          // Si conversationId est fourni directement (ex: page messagerie)
          const { data: currentConv } = await supabase
            .from('conversations')
            .select('buyer_id, seller_id')
            .eq('id', activeConvId)
            .single()

          if (currentConv) {
            interlocutorId = currentConv.buyer_id === currentUserId ? currentConv.seller_id : currentConv.buyer_id
          }
        }

        // Si l'interlocuteur n'est pas encore identifié mais sellerId est renseigné
        if (!interlocutorId && sellerId && sellerId !== currentUserId) {
          interlocutorId = sellerId
        }

        // 2. Récupérer le profil de l'interlocuteur
        if (interlocutorId && isMounted) {
          const { data: pData } = await supabase
            .from('profiles')
            .select('id, pseudo, avatar_url')
            .eq('id', interlocutorId)
            .maybeSingle()

          if (pData) {
            setOtherUser(pData)
          } else {
            setOtherUser({ id: interlocutorId, pseudo: 'Membre TrocTruc' })
          }
        }

        // 3. Récupérer les messages
        if (activeConvId && isMounted) {
          setConversationId(activeConvId)

          const { data: msgs, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', activeConvId)
            .order('created_at', { ascending: true })

          if (!msgError && msgs) {
            setMessages(msgs)
          }
        }
      } catch (err) {
        console.error("Erreur initialisation chat:", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initChat()

    return () => {
      isMounted = false
    }
  }, [annonceId, currentUserId, sellerId, initialConvId])

  // Temps réel Supabase (WebSocket)
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incomingMessage = payload.new
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === incomingMessage.id)) return prev
            return [...prev, incomingMessage]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !conversationId) return

    const textToSend = newMessage
    setNewMessage('')

    const { data, error } = await supabase.from('messages').insert([
      {
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: textToSend
      }
    ]).select()

    if (error) {
      alert("Erreur d'envoi : " + error.message)
      setNewMessage(textToSend)
    } else if (data && data.length > 0) {
      setMessages((prev) => {
        if (prev.some((msg) => msg.id === data[0].id)) return prev
        return [...prev, data[0]]
      })
    }
  }

  return (
    <div style={{ 
      position: 'fixed', bottom: '20px', right: '20px', width: '360px', height: '490px', 
      backgroundColor: 'white', borderRadius: '12px', display: 'flex', flexDirection: 'column', 
      overflow: 'hidden', boxShadow: '0 5px 25px rgba(0,0,0,0.2)', zIndex: 2000, border: '1px solid #cbd5e1',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      
      {/* Header avec informations sur l'interlocuteur */}
      <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div 
          onClick={() => otherUser?.id && router.push(`/profil/${otherUser.id}`)}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: otherUser?.id ? 'pointer' : 'default' }}
          title={otherUser?.id ? 'Cliquer pour voir le profil' : ''}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, border: '1px solid #64748b' }}>
            {otherUser?.avatar_url ? (
              <img src={otherUser.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '15px' }}>👤</span>
            )}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
              {otherUser?.pseudo || 'Discussion'}
            </h3>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {otherUser?.pseudo ? 'Voir profil' : 'En ligne'}
            </span>
          </div>
        </div>

        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer', padding: '4px 8px' }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f8fafc' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '20px' }}>Chargement...</p>
        ) : messages.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '20px', fontStyle: 'italic' }}>
            Aucun message pour l'instant. <br />Engagez la conversation !
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                {!isMe && otherUser?.pseudo && (
                  <span style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px', fontWeight: '500' }}>
                    {otherUser.pseudo}
                  </span>
                )}
                <div style={{ 
                  backgroundColor: isMe ? '#2563eb' : '#e2e8f0', 
                  color: isMe ? '#ffffff' : '#1e293b', 
                  padding: '8px 12px', borderRadius: '12px', fontSize: '13px', lineHeight: '1.4',
                  borderBottomRightRadius: isMe ? '2px' : '12px',
                  borderBottomLeftRadius: isMe ? '12px' : '2px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  wordBreak: 'break-word'
                }}>
                  {msg.content}
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', display: 'block', textAlign: isMe ? 'right' : 'left' }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Formulaire d'envoi */}
      <form onSubmit={sendMessage} style={{ padding: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px', backgroundColor: 'white' }}>
        <input
          type="text"
          placeholder="Votre message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', backgroundColor: '#ffffff' }}
        />
        <button 
          type="submit" 
          disabled={!newMessage.trim()}
          style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: newMessage.trim() ? 'pointer' : 'default', opacity: newMessage.trim() ? 1 : 0.6 }}
        >
          Envoyer
        </button>
      </form>

    </div>
  )
}