'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CovoiturageNavMenu from '@/components/CovoiturageNavMenu'

export default function Home() {
  const router = useRouter()
  const [annonces, setAnnonces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Tous')
  const [selectedTypeOffre, setSelectedTypeOffre] = useState('Tous')
  const [selectedLocation, setSelectedLocation] = useState('Tous')
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const categories = ['Tous', 'Maison', 'Loisirs', 'Multimédia', 'Jeu', 'Service', 'Véhicules', 'Immobilier', 'Autre']
  
  const typesOffre = [
    { label: 'Tous', value: 'Tous' },
    { label: 'Ventes', value: 'vente' },
    { label: 'Dons', value: 'don' },
    { label: 'Troc', value: 'troc' },
    { label: 'Recherches', value: 'recherche' }
  ]
  
  const locations = [
    { label: 'Partout', value: 'Tous' },
    { label: 'Saint-Pierre', value: 'Saint-Pierre' },
    { label: 'Miquelon', value: 'Miquelon' },
    { label: 'Langlade', value: 'Langlade' }
  ]

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        if (user.email === 'contact.troctruc@gmail.com') {
          setIsAdmin(true)
        }
        checkNewMessages(user.id)
      }
      fetchAnnonces()
    }
    init()
  }, [])

  async function checkNewMessages(userId: string) {
    try {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, buyer_id, seller_id, last_read_buyer_at, last_read_seller_at')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)

      if (!convs || convs.length === 0) return

      for (const conv of convs) {
        const { data: lastMessageData } = await supabase
          .from('messages')
          .select('sender_id, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (lastMessageData && lastMessageData.sender_id !== userId) {
          const isBuyer = conv.buyer_id === userId
          const lastReadAt = isBuyer ? conv.last_read_buyer_at : conv.last_read_seller_at

          if (!lastReadAt || new Date(lastMessageData.created_at).getTime() > new Date(lastReadAt).getTime()) {
            setHasNewMessages(true)
            return
          }
        }
      }
      
      setHasNewMessages(false)
    } catch (err) {
      console.error("Erreur lors de la vérification des messages :", err)
    }
  }

  async function fetchAnnonces() {
    setLoading(true)
    let query = supabase.from('annonces').select('*').order('created_at', { ascending: false })

    const { data, error } = await query
    if (!error && data) {
      setAnnonces(data)
    }
    setLoading(false)
  }

  async function handleValidate(e: React.MouseEvent, annonceId: string) {
    e.stopPropagation()
    const { error } = await supabase
      .from('annonces')
      .update({ status: 'validé' })
      .eq('id', annonceId)

    if (error) {
      alert("Erreur lors de la validation : " + error.message)
    } else {
      alert("Annonce validée avec succès !")
      fetchAnnonces()
    }
  }

  async function handleDeleteAdmin(e: React.MouseEvent, annonceId: string) {
    e.stopPropagation()
    if (!confirm("Voulez-vous vraiment supprimer cette annonce en tant qu'administrateur ?")) return

    const { error } = await supabase
      .from('annonces')
      .delete()
      .eq('id', annonceId)

    if (error) {
      alert("Erreur lors de la suppression : " + error.message)
    } else {
      alert("Annonce supprimée.")
      fetchAnnonces()
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
    setHasNewMessages(false)
    setMobileMenuOpen(false)
    router.refresh()
  }

  const filteredAnnonces = annonces.filter((item) => {
    const matchQuery = item.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       item.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCat = selectedCategory === 'Tous' || item.categorie === selectedCategory
    
    let itemTypeOffre = 'vente'
    if (item.description && item.description.includes('Type :')) {
      const typePart = item.description.split('Type :')[1]
      if (typePart) {
        const rawType = typePart.split('|')[0].trim().toLowerCase()
        if (rawType.includes('don')) itemTypeOffre = 'don'
        else if (rawType.includes('troc')) itemTypeOffre = 'troc'
        else if (rawType.includes('recherche')) itemTypeOffre = 'recherche'
        else if (rawType.includes('vente')) itemTypeOffre = 'vente'
      }
    }
    const matchTypeOffre = selectedTypeOffre === 'Tous' || itemTypeOffre === selectedTypeOffre

    let itemLoc = 'Saint-Pierre'