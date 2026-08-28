'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface ChatModalProps {
  annonceId: string | number
  sellerId?: string
  currentUserId: string
  conversationId?: string | null
  onClose: () => void
}

export default function ChatModal({ annonceId, sellerId, currentUserId, conversationId: initialConvId, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(initialConvId || null)
  const [loading, setLoading] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 1. Initialisation de la conversation et des messages
  useEffect(() => {
    let isMounted = true

    async function initChat() {
      if (!currentUserId) return
      setLoading(true)

      try {
        let activeConvId = initialConvId

        // Si pas d'ID direct, on cherche ou crée la conversation
        if (!activeConvId && annonceId) {
          // On cherche une conversation existante liée à cette annonce 
          // où l'utilisateur courant est soit l'acheteur, soit le vendeur
          const { data: existingConvs, error: searchError } = await supabase
            .from('conversations')
            .select('*')
            .eq('annonce_id', annonceId)
            .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)

          if (!searchError && existingConvs && existingConvs.length > 0) {
            // On prend la première conversation valide trouvée
            activeConvId = existingConvs[0].id
          } else {
            // Sinon on la crée
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
            }
          }
        }

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

  // 2. Remplacement du polling par le Realtime Supabase (WebSocket)
  useEffect(() => {
    if (!conversationId) return

    // Écoute en temps réel des nouveaux messages sur cette conversation
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
            // Évite les doublons si le message a déjà été ajouté localement lors de l'envoi
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
      setNewMessage(textToSend) // Restaure le texte en cas d'échec
    } else if (data && data.length > 0) {
      // Ajout optimiste immédiat (le Realtime confirmera, géré par la condition .some() plus haut)
      setMessages((prev) => {
        if (prev.some((msg) => msg.id === data[0].id)) return prev
        return [...prev, data[0]]
      })
    }
  }

  return (
    <div style={{ 
      position: 'fixed', bottom: '20px', right: '20px', width: '360px', height: '480px', 
      backgroundColor: 'white', borderRadius: '12px', display: 'flex', flexDirection: 'column', 
      overflow: 'hidden', boxShadow: '0 5px 25px rgba(0,0,0,0.2)', zIndex: 2000, border: '1px solid #cbd5e1',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      
      {/* Header */}
      <div style={{ backgroundColor: '#2c3e50', color: 'white', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>Discussion</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '16px', cursor: 'pointer' }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f1f5f9' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '20px' }}>Chargement...</p>
        ) : messages.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '20px', fontStyle: 'italic' }}>Aucun message pour l'instant. <br />Soyez le premier à écrire !</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                <div style={{ 
                  backgroundColor: isMe ? '#1e40af' : '#bfdbfe', 
                  color: isMe ? 'white' : '#1e3a8a', 
                  padding: '8px 12px', borderRadius: '12px', fontSize: '14px', lineHeight: '1.4',
                  borderBottomRightRadius: isMe ? '4px' : '12px',
                  borderBottomLeftRadius: isMe ? '12px' : '4px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  {msg.content}
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block', textAlign: isMe ? 'right' : 'left' }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Formulaire d'envoi */}
      <form onSubmit={sendMessage} style={{ padding: '10px 12px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px', backgroundColor: 'white' }}>
        <input
          type="text"
          placeholder="Votre message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', backgroundColor: '#f8fafc' }}
        />
        <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
          Envoyer
        </button>
      </form>

    </div>
  )
}