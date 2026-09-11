'use client'

import { useEffect, useState } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (isStandalone) {
      setShowBanner(false)
      return
    }

    const userAgent = window.navigator.userAgent.toLowerCase()

    const iosDevice = /iphone|ipad|ipod/.test(userAgent)
    const mobileDevice =
      /android|iphone|ipad|ipod|mobile/.test(userAgent)

    setIsIOS(iosDevice)
    setIsMobile(mobileDevice)

    if (!mobileDevice) {
      setShowBanner(false)
      return
    }

    const dismissedAt =
      localStorage.getItem('troctruc-install-prompt-dismissed-at')

    if (dismissedAt) {
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      const dismissedDate = Number(dismissedAt)

      if (Date.now() - dismissedDate < sevenDays) {
        setShowBanner(false)
        return
      }

      localStorage.removeItem(
        'troctruc-install-prompt-dismissed-at'
      )
    }

    const handleBeforeInstallPrompt = (event: any) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setShowBanner(false)
    }

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt
    )

    window.addEventListener(
      'appinstalled',
      handleAppInstalled
    )

    // Sur mobile web, on affiche le bouton.
    // Si Chrome fournit le prompt natif, on l'utilisera.
    // Sinon, on donnera les instructions.
    setShowBanner(true)

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      )

      window.removeEventListener(
        'appinstalled',
        handleAppInstalled
      )
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(
      'troctruc-install-prompt-dismissed-at',
      Date.now().toString()
    )

    setShowBanner(false)
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()

      const { outcome } =
        await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setShowBanner(false)
      }

      setDeferredPrompt(null)
      return
    }

    if (isIOS) {
      alert(
        "Pour installer TrocTruc SPM :\n\n" +
          "1. Ouvrez le site dans Safari.\n" +
          "2. Appuyez sur le bouton Partager.\n" +
          "3. Choisissez « Sur l'écran d'accueil »."
      )

      return
    }

    alert(
      "Pour installer TrocTruc SPM :\n\n" +
        "1. Ouvrez le menu ⋮ de votre navigateur.\n" +
        "2. Choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil »."
    )
  }

  if (!showBanner || !isMobile) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: '#2563eb',
        borderRadius: '30px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        padding: '4px 6px 4px 14px',
        maxWidth: 'calc(100vw - 30px)',
      }}
    >
      <button
        onClick={handleInstallClick}
        style={{
          backgroundColor: 'transparent',
          color: 'white',
          border: 'none',
          padding: '8px 6px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
          whiteSpace: 'nowrap',
        }}
      >
        📲 Installer TrocTruc SPM
      </button>

      <button
        onClick={handleDismiss}
        aria-label="Fermer"
        title="Masquer pendant 7 jours"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'rgba(255,255,255,0.18)',
          color: 'white',
          cursor: 'pointer',
          fontSize: '20px',
          lineHeight: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}