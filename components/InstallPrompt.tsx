'use client'

import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    // 1. Vérifie si l'application est déjà lancée en mode PWA installée (standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    if (isStandalone) {
      setShowButton(false)
      return
    }

    // 2. Écoute l'événement d'installation du navigateur
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowButton(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()

    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      console.log('Utilisateur a accepté l\'installation PWA')
      // Masque immédiatement le bouton après acceptation
      setShowButton(false)
    }

    setDeferredPrompt(null)
  }

  if (!showButton) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#2563eb',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '30px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '14px'
    }} onClick={handleInstallClick}>
      <span>📲 Installer TrocTruc SPM</span>
    </div>
  )
}