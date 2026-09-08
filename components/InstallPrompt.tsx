'use client'

import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    // Vérifie si l'app est déjà en mode autonome
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    if (isStandalone) return

    const handleBeforeInstallPrompt = (e: any) => {
      // Empêche Chrome d'afficher sa bannière par défaut
      e.preventDefault()
      // Stocke l'événement
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
      setShowButton(false)
    }
    setDeferredPrompt(null)
  }

  if (!showButton) return null

  return (
    <button
      onClick={handleInstallClick}
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#2563eb',
        color: 'white',
        border: 'none',
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
      }}
    >
      <span>📲 Installer TrocTruc SPM</span>
    </button>
  )
}