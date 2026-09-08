'use client'

import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // 1. Vérifie si l'app est déjà en mode standalone (installée)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    if (isStandalone) return

    // 2. Détecte si c'est un iPhone/iPad (car iOS ne gère pas du tout beforeinstallprompt)
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    // 3. Écoute l'événement standard Android/Chrome
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // On affiche le bouton dans tous les cas sur mobile pour que l'utilisateur puisse cliquer
    setShowBanner(true)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Si l'événement magique de Chrome est dispo, on lance le prompt natif
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowBanner(false)
      }
      setDeferredPrompt(null)
    } else if (isIOS) {
      alert("Pour installer TrocTruc sur votre iPhone :\n\n1. Appuyez sur le bouton de partage ⎋ en bas de Safari.\n2. Choisissez 'Sur l'écran d'accueil'.")
    } else {
      alert("Pour installer l'application :\n\nAppuyez sur les trois petits points ⋮ en haut à droite de votre navigateur, puis choisissez 'Installer l'application' ou 'Ajouter à l'écran d'accueil'.")
    }
  }

  if (!showBanner) return null

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
        padding: '12px 24px',
        borderRadius: '30px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        zIndex: 9999,
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