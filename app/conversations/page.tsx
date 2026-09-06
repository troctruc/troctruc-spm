'use client'



import { useState, useEffect } from 'react'

import { supabase } from '@/lib/supabase'

import ChatModal from '@/components/ChatModal'

import Link from 'next/link'



export default function ConversationsPage() {

const [conversations, setConversations] = useState<any[]>([])

const [blockedUsers, setBlockedUsers] = useState<any[]>([])

const [activeTab, setActiveTab] = useState<'conversations' | 'blocked'>('conversations')

const [loading, setLoading] = useState(true)

const [currentUser, setCurrentUser] = useState<any>(null)

const [activeAnnonce, setActiveAnnonce] = useState<any>(null)

const [activeConversationId, setActiveConversationId] = useState<string | null>(null)

const [activeOtherUserId, setActiveOtherUserId] = useState<string | null>(null)



useEffect(() => {

fetchData()

}, [])



async function fetchData() {

setLoading(true)

const { data: { user } } = await supabase.auth.getUser()

if (!user) {

setLoading(false)

return

}

setCurrentUser(user)



// 1. Récupérer les utilisateurs bloqués

const { data: blocksData, error: blockError } = await supabase

.from('blocks')

.select('id, blocked_id')

.eq('blocker_id', user.id)



if (blockError) {

console.error("Erreur récupération blocs :", blockError.message)

}



const blockedList = blocksData || []

setBlockedUsers(blockedList)

const blockedIds = blockedList.map(b => b.blocked_id)



// 2. Récupérer uniquement les conversations de l'utilisateur connecté

const { data, error } = await supabase

.from('conversations')

.select('*')

.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)

.order('created_at', { ascending: false })



if (error) {

console.error("Erreur Supabase conversations :", error.message)

}



if (data) {

const enrichedConversations = await Promise.all(

data.map(async (conv) => {

// Récupérer l'annonce associée

const { data: annonceData } = await supabase

.from('annonces')

.select('*')

.eq('id', conv.annonce_id)

.single()



// Récupérer le dernier message de la conversation

const { data: lastMessageData } = await supabase

.from('messages')

.select('sender_id, created_at')

.eq('conversation_id', conv.id)

.order('created_at', { ascending: false })

.limit(1)

.maybeSingle()



let hasUnread = false

if (lastMessageData && lastMessageData.sender_id !== user.id) {

const isBuyer = conv.buyer_id === user.id

const lastReadAt = isBuyer ? conv.last_read_buyer_at : conv.last_read_seller_at



if (!lastReadAt) {

hasUnread = true

} else {

hasUnread = new Date(lastMessageData.created_at).getTime() > new Date(lastReadAt).getTime()

}

}



return {

...conv,

annonces: annonceData || null,

hasUnread

}

})

)



// Filtrer uniquement selon les utilisateurs bloqués

const filtered = enrichedConversations.filter((conv: any) => {

const otherId = conv.seller_id === user.id ? conv.buyer_id : conv.seller_id

return !blockedIds.includes(otherId)

})


setConversations(filtered)

}

setLoading(false)

}



// Ouvrir une conversation et mettre à jour le timestamp de lecture dans Supabase

async function handleOpenConversation(annonce: any, convId: string, otherUserId: string) {

if (currentUser) {

const currentConv = conversations.find(c => c.id === convId)

if (currentConv) {

const isBuyer = currentConv.buyer_id === currentUser.id

const fieldToUpdate = isBuyer ? 'last_read_buyer_at' : 'last_read_seller_at'


await supabase

.from('conversations')

.update({ [fieldToUpdate]: new Date().toISOString() })

.eq('id', convId)

}

}



setActiveAnnonce(annonce || { id: 'inconnue', titre: 'Annonce introuvable' })

setActiveConversationId(convId)

setActiveOtherUserId(otherUserId)

}



// Supprimer un fil de discussion

async function handleDeleteConversation(e: React.MouseEvent, conversationId: string) {

e.stopPropagation()

if (!confirm("Voulez-vous vraiment supprimer cette discussion ?")) return



const { error } = await supabase

.from('conversations')

.delete()

.eq('id', conversationId)



if (error) {

alert("Erreur lors de la suppression : " + error.message)

} else {

setConversations(conversations.filter(c => c.id !== conversationId))

if (activeConversationId === conversationId) {

setActiveAnnonce(null)

setActiveConversationId(null)

}

}

}



// Bloquer un utilisateur

async function handleBlockUser(e: React.MouseEvent, userIdToBlock: string) {

e.stopPropagation()

if (!confirm("Voulez-vous vraiment bloquer cet utilisateur ? Vous ne pourrez plus échanger ensemble.")) return



const { error } = await supabase

.from('blocks')

.insert([{ blocker_id: currentUser.id, blocked_id: userIdToBlock }])



if (error) {

alert("Erreur lors du blocage : " + error.message)

} else {

alert("Utilisateur bloqué avec succès.")

setActiveAnnonce(null)

setActiveConversationId(null)

fetchData()

}

}



// Débloquer un utilisateur

async function handleUnblockUser(blockId: string) {

if (!confirm("Voulez-vous débloquer cet utilisateur ?")) return



const { error } = await supabase

.from('blocks')

.delete()

.eq('id', blockId)



if (error) {

alert("Erreur lors du déblocage : " + error.message)

} else {

fetchData()

}

}



if (loading) {

return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>Chargement...</div>

}



// SI UNE DISCUSSION EST CLIQUÉE

if (activeAnnonce && currentUser && activeConversationId) {

let imageUrl = activeAnnonce.image_url || activeAnnonce.image_urls || activeAnnonce.image || activeAnnonce.photo

if (Array.isArray(activeAnnonce.photos) && activeAnnonce.photos.length > 0) {

imageUrl = activeAnnonce.photos[0]

}

if (typeof imageUrl === 'string' && imageUrl.includes(',')) {

imageUrl = imageUrl.split(',')[0].trim()

}



const annonceTitle = activeAnnonce.titre || activeAnnonce.title || "Annonce sans titre"

const annonceDesc = activeAnnonce.description || "Aucune description"



return (

<div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', position: 'relative' }}>

<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>

<button

onClick={() => { setActiveAnnonce(null); setActiveConversationId(null); fetchData(); }}

style={{ padding: '8px 15px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontWeight: '500' }}

>

← Retour à mes discussions

</button>



{activeOtherUserId && (

<button

onClick={(e) => handleBlockUser(e, activeOtherUserId)}

style={{ padding: '8px 15px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #e74c3c', backgroundColor: '#fff', color: '#e74c3c', fontWeight: 'bold' }}

>

🚫 Bloquer l'utilisateur

</button>

)}

</div>



<div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>

{imageUrl ? (

<img

src={imageUrl}

alt={annonceTitle}

style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '8px', marginBottom: '20px' }}

/>

) : (

<div style={{ width: '100%', height: '200px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', marginBottom: '20px' }}>

Aucune image pour cette annonce

</div>

)}



<h1 style={{ fontSize: '24px', color: '#2c3e50', marginBottom: '10px' }}>{annonceTitle}</h1>

<p style={{ color: '#555', lineHeight: '1.6', fontSize: '15px' }}>{annonceDesc}</p>

</div>



<ChatModal

annonceId={activeAnnonce.id}

sellerId={activeAnnonce.user_id}

currentUserId={currentUser.id}

conversationId={activeConversationId}

onClose={() => { setActiveAnnonce(null); setActiveConversationId(null); fetchData(); }}

/>

</div>

)

}



// PAGE PRINCIPALE AVEC LES ONGLETS

return (

<div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>


{/* BOUTON ACCUEIL ET EN-TÊTE */}

<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>

<div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>

<img

src="/puffin-logo.jpeg"

alt="Logo TrocTruc SPM"

style={{ width: '45px', height: '45px', objectFit: 'contain', borderRadius: '8px' }}

/>

<h1 style={{ margin: 0, fontSize: '28px', color: '#1e293b' }}>Mes Messages</h1>

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

border: '1px solid #cbd5e1',

transition: 'background-color 0.2s ease'

}}

onMouseEnter={(e) => {

e.currentTarget.style.backgroundColor = '#e2e8f0'

}}

onMouseLeave={(e) => {

e.currentTarget.style.backgroundColor = '#f1f5f9'

}}

>

Accueil

</Link>

</div>



{/* ONGLETS DE NAVIGATION */}

<div style={{ display: 'flex', gap: '10px', marginTop: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>

<button

onClick={() => setActiveTab('conversations')}

style={{

padding: '8px 16px',

borderRadius: '6px',

border: 'none',

cursor: 'pointer',

fontWeight: 'bold',

backgroundColor: activeTab === 'conversations' ? '#2ecc71' : '#e2e8f0',

color: activeTab === 'conversations' ? 'white' : '#475569'

}}

>

Discussions ({conversations.length})

</button>

<button

onClick={() => setActiveTab('blocked')}

style={{

padding: '8px 16px',

borderRadius: '6px',

border: 'none',

cursor: 'pointer',

fontWeight: 'bold',

backgroundColor: activeTab === 'blocked' ? '#e74c3c' : '#e2e8f0',

color: activeTab === 'blocked' ? 'white' : '#475569'

}}

>

Utilisateurs bloqués ({blockedUsers.length})

</button>

</div>



{/* CONTENU DE L'ONGLET DISCUSSIONS */}

{activeTab === 'conversations' && (

<div style={{ marginTop: '20px' }}>

{conversations.length === 0 ? (

<p style={{ color: '#666' }}>Vous n'avez aucune discussion pour le moment.</p>

) : (

<ul style={{ listStyle: 'none', padding: 0 }}>

{conversations.map((conv) => {

const annonce = conv.annonces || { titre: 'Annonce' }



let thumbUrl = annonce.image_url || annonce.image_urls || annonce.image || annonce.photo

if (Array.isArray(annonce.photos) && annonce.photos.length > 0) {

thumbUrl = annonce.photos[0]

}

if (typeof thumbUrl === 'string' && thumbUrl.includes(',')) {

thumbUrl = thumbUrl.split(',')[0].trim()

}



const annonceTitle = annonce.titre || annonce.title || "Annonce"

const otherUserId = conv.seller_id === currentUser.id ? conv.buyer_id : conv.seller_id



return (

<li key={conv.id} style={{ marginBottom: '15px' }}>

<div

onClick={() => handleOpenConversation(annonce, conv.id, otherUserId)}

style={{

display: 'flex',

alignItems: 'center',

justifyContent: 'space-between',

padding: '12px',

backgroundColor: conv.hasUnread ? '#eef9f1' : '#f8f9fa',

border: conv.hasUnread ? '1px solid #2ecc71' : '1px solid #cbd5e1',

borderRadius: '8px',

cursor: 'pointer',

boxShadow: '0 2px 4px rgba(0,0,0,0.05)'

}}

>

<div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>

{thumbUrl ? (

<img src={thumbUrl} alt="" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }} />

) : (

<div style={{ width: '50px', height: '50px', backgroundColor: '#e2e8f0', borderRadius: '6px' }} />

)}

<div>

<h3 style={{

margin: '0 0 4px 0',

fontSize: '15px',

color: '#2c3e50',

fontWeight: conv.hasUnread ? 'bold' : 'normal'

}}>

{annonceTitle} {conv.hasUnread && <span style={{ color: '#2ecc71', fontSize: '12px' }}>● Nouveau</span>}

</h3>

<span style={{

fontSize: '12px',

color: conv.hasUnread ? '#27ae60' : '#7f8c8d',

fontWeight: conv.hasUnread ? 'bold' : 'normal'

}}>

{conv.hasUnread ? "Nouveau message reçu" : "Voir l'annonce et discuter"}

</span>

</div>

</div>



{/* BOUTONS ACTIONS : POUBELLE + BLOQUER */}

<div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>

<button

onClick={(e) => handleDeleteConversation(e, conv.id)}

title="Supprimer la discussion"

style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '6px' }}

>

🗑️

</button>

<button

onClick={(e) => handleBlockUser(e, otherUserId)}

title="Bloquer l'utilisateur"

style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '6px' }}

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



{/* CONTENU DE L'ONGLET UTILISATEURS BLOQUÉS */}

{activeTab === 'blocked' && (

<div style={{ marginTop: '20px' }}>

{blockedUsers.length === 0 ? (

<p style={{ color: '#666' }}>Vous n'avez bloqué aucun utilisateur.</p>

) : (

<ul style={{ listStyle: 'none', padding: 0 }}>

{blockedUsers.map((item) => (

<li key={item.id} style={{ marginBottom: '15px' }}>

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

<span style={{ fontSize: '14px', color: '#c53030', fontWeight: '500' }}>

Utilisateur bloqué (ID : {item.blocked_id.slice(0, 8)}...)

</span>

<button

onClick={() => handleUnblockUser(item.id)}

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

