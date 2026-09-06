'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function CovoiturageNavMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ferme le menu déroulant en cas de clic à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef}>
      {/* BOUTON PRINCIPAL ONGLET COVOITURAGE */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#2563eb',
          color: '#ffffff',
          border: 'none',
          padding: '8px 15px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
      >
        <span>🚗 Covoiturage</span>
        <span style={{ fontSize: '10px', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </button>

      {/* MENU DÉROULANT */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '230px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            padding: '4px 0'
          }}
        >
          {/* OPTION 1 : PROPOSER */}
          <Link
            href="/covoiturage/nouveau"
            onClick={() => setIsOpen(false)}
            style={{
              padding: '11px 16px',
              fontSize: '13px',
              color: '#1e293b',
              textDecoration: 'none',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderBottom: '1px solid #f1f5f9',
              transition: 'background-color 0.15s, color 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#eff6ff';
              e.currentTarget.style.color = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#1e293b';
            }}
          >
            <span>➕</span> Proposer un covoiturage
          </Link>

          {/* OPTION 2 : VOIR LES COVOITURAGES */}
          <Link
            href="/covoiturage"
            onClick={() => setIsOpen(false)}
            style={{
              padding: '11px 16px',
              fontSize: '13px',
              color: '#1e293b',
              textDecoration: 'none',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'background-color 0.15s, color 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#eff6ff';
              e.currentTarget.style.color = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#1e293b';
            }}
          >
            <span>👀</span> Voir les covoiturages
          </Link>
        </div>
      )}
    </div>
  );
}