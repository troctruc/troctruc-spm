'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ModifierAnnoncePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const annonceId = params?.id

  const [user, setUser] = useState<any>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [errorMsg, setErrorMsg] = useState('')

  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [prix, setPrix] = useState('')

  const [categorie, setCategorie] = useState('Maison')
  const [sousCategorie, setSousCategorie] = useState('')

  const [typeAnnonce, setTypeAnnonce] = useState('vente')
  const [localisation, setLocalisation] = useState('Saint-Pierre')

  const [photos, setPhotos] = useState<string[]>([])

  const categories = [
    'Maison',
    'Loisirs',
    'Multimédia',
    'Jeu',
    'Service',
    'Véhicules',
    'Immobilier',
    'Mode',
    'Autre',
  ]

  const modeSubcategories = [
    'Vêtements',
    'Chaussures',
    'Bijoux',
    'Accessoires',
  ]

  const locations = [
    'Saint-Pierre',
    'Miquelon',
    'Langlade',
  ]

  useEffect(() => {
    async function loadAnnonce() {
      if (!annonceId) {
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth')
        return
      }

      setUser(user)

      const { data, error } = await supabase
        .from('annonces')
        .select(
          'id, titre, description, prix, categorie, photos, status, validated, user_id'
        )
        .eq('id', annonceId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        setErrorMsg(
          "Impossible de charger l'annonce : " +
            error.message
        )

        setLoading(false)
        return
      }

      if (!data) {
        setErrorMsg(
          "Cette annonce n'existe pas ou ne vous appartient pas."
        )

        setLoading(false)
        return
      }

      setTitre(data.titre || '')

      setPrix(
        data.prix !== null &&
          data.prix !== undefined
          ? String(data.prix)
          : ''
      )

      setCategorie(
        data.categorie || 'Maison'
      )

      setPhotos(
        Array.isArray(data.photos)
          ? data.photos
          : []
      )

      parseStoredDescription(
        data.description || ''
      )

      setLoading(false)
    }

    loadAnnonce()
  }, [annonceId, router])

  function parseStoredDescription(
    storedDescription: string
  ) {
    const parts =
      storedDescription.split('\n\n')

    const firstLine =
      parts[0] || ''

    if (
      !firstLine.startsWith('Type :')
    ) {
      setDescription(storedDescription)
      return
    }

    const metaParts =
      firstLine
        .split('|')
        .map((part) =>
          part.trim()
        )

    const typePart =
      metaParts.find((part) =>
        part.startsWith('Type :')
      )

    const locationPart =
      metaParts.find((part) =>
        part.startsWith(
          'Localisation :'
        )
      )

    const subCategoryPart =
      metaParts.find((part) =>
        part.startsWith(
          'Sous-catégorie :'
        )
      )

    const storedType =
      typePart
        ?.replace('Type :', '')
        .trim()
        .toUpperCase()

    if (
      storedType === 'RECHERCHES'
    ) {
      setTypeAnnonce(
        'recherche'
      )
    } else if (
      storedType === 'TROC'
    ) {
      setTypeAnnonce('troc')
    } else if (
      storedType === 'DON'
    ) {
      setTypeAnnonce('don')
    } else {
      setTypeAnnonce('vente')
    }

    if (locationPart) {
      setLocalisation(
        locationPart
          .replace(
            'Localisation :',
            ''
          )
          .trim()
      )
    }

    if (subCategoryPart) {
      setSousCategorie(
        subCategoryPart
          .replace(
            'Sous-catégorie :',
            ''
          )
          .trim()
      )
    }

    setDescription(
      parts
        .slice(1)
        .join('\n\n')
    )
  }

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    if (
      !e.target.files ||
      e.target.files.length === 0
    ) {
      return
    }

    const files =
      Array.from(
        e.target.files
      )

    if (
      photos.length +
        files.length >
      5
    ) {
      alert(
        'Vous pouvez ajouter au maximum 5 photos.'
      )
      return
    }

    setUploading(true)

    try {
      const newPhotos = [
        ...photos,
      ]

      for (const file of files) {
        const compressedBase64 =
          await resizeImage(
            file,
            800,
            0.7
          )

        newPhotos.push(
          compressedBase64
        )
      }

      setPhotos(newPhotos)
    } catch (error) {
      console.error(error)

      alert(
        "Une erreur s'est produite pendant le traitement des photos."
      )
    } finally {
      setUploading(false)
    }
  }

  function resizeImage(
    file: File,
    maxWidth: number,
    quality: number
  ): Promise<string> {
    return new Promise(
      (resolve, reject) => {
        const reader =
          new FileReader()

        reader.readAsDataURL(file)

        reader.onload = (
          event
        ) => {
          const img =
            new Image()

          img.src =
            event.target
              ?.result as string

          img.onload = () => {
            const canvas =
              document.createElement(
                'canvas'
              )

            let width =
              img.width

            let height =
              img.height

            if (
              width > maxWidth
            ) {
              height =
                Math.round(
                  (height *
                    maxWidth) /
                    width
                )

              width =
                maxWidth
            }

            canvas.width =
              width

            canvas.height =
              height

            const ctx =
              canvas.getContext(
                '2d'
              )

            if (!ctx) {
              reject(
                new Error(
                  "Impossible d'obtenir le contexte canvas"
                )
              )

              return
            }

            ctx.drawImage(
              img,
              0,
              0,
              width,
              height
            )

            resolve(
              canvas.toDataURL(
                'image/jpeg',
                quality
              )
            )
          }

          img.onerror =
            reject
        }

        reader.onerror =
          reject
      }
    )
  }

  function removePhoto(
    index: number
  ) {
    setPhotos(
      photos.filter(
        (_, i) =>
          i !== index
      )
    )
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault()

    if (
      !user ||
      !annonceId
    ) {
      return
    }

    if (
      !titre.trim() ||
      !description.trim()
    ) {
      alert(
        'Veuillez remplir le titre et la description.'
      )

      return
    }

    if (
      categorie === 'Mode' &&
      !sousCategorie
    ) {
      alert(
        'Veuillez choisir une sous-catégorie pour la mode.'
      )

      return
    }

    let prixFinal = 0

    if (
      typeAnnonce === 'vente'
    ) {
      if (
        prix === '' ||
        Number(prix) < 0
      ) {
        alert(
          'Veuillez indiquer un prix valide.'
        )

        return
      }

      prixFinal =
        Number(prix)
    }

    const typeLabel =
      typeAnnonce ===
      'recherche'
        ? 'RECHERCHES'
        : typeAnnonce.toUpperCase()

    const sousCategorieInfo =
      categorie === 'Mode' &&
      sousCategorie
        ? ` | Sous-catégorie : ${sousCategorie}`
        : ''

    const formattedDescription =
      `Type : ${typeLabel} | Localisation : ${localisation}${sousCategorieInfo}\n\n${description.trim()}`

    setSaving(true)
    setErrorMsg('')

    const { error } =
      await supabase
        .from('annonces')
        .update({
          titre:
            titre.trim(),

          description:
            formattedDescription,

          prix:
            prixFinal,

          categorie,

          photos,

          status:
            'en attente',

          validated:
            false,
        })
        .eq(
          'id',
          annonceId
        )
        .eq(
          'user_id',
          user.id
        )

    if (error) {
      setSaving(false)

      setErrorMsg(
        "Impossible de modifier l'annonce : " +
          error.message
      )

      return
    }

    /*
      NOTIFICATION ADMINISTRATEUR
      ------------------------------------------------
      À ce stade, l'annonce est bien modifiée.
      On prévient maintenant l'administrateur qu'elle
      doit être revalidée.
    */

    try {
      const notificationResponse =
        await fetch(
          '/api/notify-admin',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                id: annonceId,

                titre:
                  titre.trim(),

                categorie,

                prix:
                  prixFinal,

                status:
                  'en attente',

                user_id:
                  user.id,

                type:
                  'modification',
              }),
          }
        )

      const notificationData =
        await notificationResponse.json()

      if (
        !notificationResponse.ok
      ) {
        console.error(
          'Erreur notification admin :',
          notificationData
        )

        alert(
          "L'annonce a bien été modifiée, mais la notification administrateur n'a pas pu être envoyée."
        )
      } else {
        console.log(
          'Notification admin envoyée avec succès :',
          notificationData
        )
      }
    } catch (
      notificationError
    ) {
      console.error(
        'Erreur notification admin :',
        notificationError
      )

      alert(
        "L'annonce a bien été modifiée, mais une erreur est survenue lors de l'envoi de la notification administrateur."
      )
    }

    setSaving(false)

    alert(
      "Votre annonce a été modifiée. Elle repasse en attente de validation."
    )

    router.push(
      `/annonces/${annonceId}`
    )

    router.refresh()
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight:
            '100vh',

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center',

          fontFamily:
            'sans-serif',

          backgroundColor:
            '#f4f6f8',
        }}
      >
        Chargement de l'annonce...
      </div>
    )
  }

  if (
    errorMsg &&
    !titre
  ) {
    return (
      <div
        style={{
          minHeight:
            '100vh',

          backgroundColor:
            '#f4f6f8',

          fontFamily:
            'sans-serif',

          padding:
            '40px 20px',
        }}
      >
        <div
          style={{
            maxWidth:
              '700px',

            margin:
              '0 auto',

            backgroundColor:
              '#fff',

            borderRadius:
              '12px',

            padding:
              '30px',
          }}
        >
          <p
            style={{
              color:
                '#b91c1c',
            }}
          >
            {errorMsg}
          </p>

          <button
            onClick={() =>
              router.push(
                '/mes-annonces'
              )
            }
          >
            ← Retour à mes annonces
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight:
          '100vh',

        backgroundColor:
          '#f4f6f8',

        paddingBottom:
          '60px',

        fontFamily:
          'sans-serif',
      }}
    >
      {/* HEADER */}

      <header
        style={{
          backgroundColor:
            '#ffffff',

          borderBottom:
            '1px solid #e1e4e8',

          padding:
            '15px 30px',

          display:
            'flex',

          justifyContent:
            'space-between',

          alignItems:
            'center',
        }}
      >
        <div
          onClick={() =>
            router.push('/')
          }
          style={{
            display:
              'flex',

            alignItems:
              'center',

            gap:
              '12px',

            cursor:
              'pointer',
          }}
        >
          <img
            src="/puffin-logo.jpeg"
            alt="TrocTruc SPM"
            style={{
              width:
                '45px',

              height:
                '45px',

              objectFit:
                'contain',

              borderRadius:
                '8px',
            }}
          />

          <div>
            <h1
              style={{
                margin: 0,

                fontSize:
                  '18px',

                color:
                  '#2c3e50',
              }}
            >
              TrocTruc SPM
            </h1>

            <p
              style={{
                margin: 0,

                fontSize:
                  '11px',

                color:
                  '#7f8c8d',
              }}
            >
              Modifier mon annonce
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push(
              `/annonces/${annonceId}`
            )
          }
          style={{
            background:
              'none',

            border:
              '1px solid #cbd5e1',

            padding:
              '7px 12px',

            borderRadius:
              '6px',

            color:
              '#475569',

            cursor:
              'pointer',
          }}
        >
          ← Annuler
        </button>
      </header>

      {/* FORMULAIRE */}

      <main
        style={{
          maxWidth:
            '700px',

          margin:
            '30px auto',

          padding:
            '0 20px',
        }}
      >
        <div
          style={{
            backgroundColor:
              '#ffffff',

            borderRadius:
              '12px',

            padding:
              '30px',

            boxShadow:
              '0 2px 8px rgba(0,0,0,0.05)',

            border:
              '1px solid #e1e4e8',
          }}
        >
          <h2
            style={{
              marginTop: 0,

              color:
                '#2c3e50',
            }}
          >
            ✏️ Modifier mon annonce
          </h2>

          <p
            style={{
              fontSize:
                '13px',

              color:
                '#64748b',

              marginBottom:
                '25px',
            }}
          >
            Après modification, l'annonce repassera en attente de validation.
          </p>

          {errorMsg && (
            <div
              style={{
                backgroundColor:
                  '#fee2e2',

                color:
                  '#b91c1c',

                padding:
                  '12px',

                borderRadius:
                  '7px',

                marginBottom:
                  '20px',
              }}
            >
              {errorMsg}
            </div>
          )}

          <form
            onSubmit={
              handleSubmit
            }
            style={{
              display:
                'flex',

              flexDirection:
                'column',

              gap:
                '20px',
            }}
          >
            {/* TYPE */}

            <div>
              <label
                style={
                  labelStyle
                }
              >
                Type d'annonce
              </label>

              <select
                value={
                  typeAnnonce
                }
                onChange={(e) =>
                  setTypeAnnonce(
                    e.target.value
                  )
                }
                style={
                  inputStyle
                }
              >
                <option value="vente">
                  Vente
                </option>

                <option value="troc">
                  Troc
                </option>

                <option value="don">
                  Don
                </option>

                <option value="recherche">
                  Recherche
                </option>
              </select>
            </div>

            {/* TITRE */}

            <div>
              <label
                style={
                  labelStyle
                }
              >
                Titre
              </label>

              <input
                type="text"
                required
                value={titre}
                onChange={(e) =>
                  setTitre(
                    e.target.value
                  )
                }
                style={
                  inputStyle
                }
              />
            </div>

            {/* CATEGORIE + LOCALISATION */}

            <div
              style={{
                display:
                  'grid',

                gridTemplateColumns:
                  '1fr 1fr',

                gap:
                  '15px',
              }}
            >
              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Catégorie
                </label>

                <select
                  value={
                    categorie
                  }
                  onChange={(e) => {
                    const next =
                      e.target.value

                    setCategorie(
                      next
                    )

                    if (
                      next !==
                      'Mode'
                    ) {
                      setSousCategorie(
                        ''
                      )
                    }
                  }}
                  style={
                    inputStyle
                  }
                >
                  {categories.map(
                    (cat) => (
                      <option
                        key={
                          cat
                        }
                        value={
                          cat
                        }
                      >
                        {cat}
                      </option>
                    )
                  )}
                </select>

                {categorie ===
                  'Mode' && (
                  <select
                    value={
                      sousCategorie
                    }
                    onChange={(
                      e
                    ) =>
                      setSousCategorie(
                        e.target
                          .value
                      )
                    }
                    required
                    style={{
                      ...inputStyle,

                      marginTop:
                        '10px',
                    }}
                  >
                    <option value="">
                      Choisir une sous-catégorie
                    </option>

                    {modeSubcategories.map(
                      (
                        subcat
                      ) => (
                        <option
                          key={
                            subcat
                          }
                          value={
                            subcat
                          }
                        >
                          {
                            subcat
                          }
                        </option>
                      )
                    )}
                  </select>
                )}
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Localisation
                </label>

                <select
                  value={
                    localisation
                  }
                  onChange={(
                    e
                  ) =>
                    setLocalisation(
                      e.target
                        .value
                    )
                  }
                  style={
                    inputStyle
                  }
                >
                  {locations.map(
                    (loc) => (
                      <option
                        key={
                          loc
                        }
                        value={
                          loc
                        }
                      >
                        {loc}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {/* PRIX */}

            {typeAnnonce ===
              'vente' && (
              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Prix (€)
                </label>

                <input
                  type="number"
                  min="0"
                  required
                  value={prix}
                  onChange={(
                    e
                  ) =>
                    setPrix(
                      e.target
                        .value
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </div>
            )}

            {/* DESCRIPTION */}

            <div>
              <label
                style={
                  labelStyle
                }
              >
                Description
              </label>

              <textarea
                rows={6}
                required
                value={
                  description
                }
                onChange={(e) =>
                  setDescription(
                    e.target
                      .value
                  )
                }
                style={{
                  ...inputStyle,

                  resize:
                    'vertical',
                }}
              />
            </div>

            {/* PHOTOS */}

            <div>
              <label
                style={
                  labelStyle
                }
              >
                Photos (maximum 5)
              </label>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={
                  handleImageUpload
                }
              />

              {uploading && (
                <p
                  style={{
                    color:
                      '#e67e22',

                    fontSize:
                      '12px',
                  }}
                >
                  Compression des photos...
                </p>
              )}

              {photos.length >
                0 && (
                <div
                  style={{
                    display:
                      'flex',

                    gap:
                      '10px',

                    flexWrap:
                      'wrap',

                    marginTop:
                      '12px',
                  }}
                >
                  {photos.map(
                    (
                      photo,
                      index
                    ) => (
                      <div
                        key={
                          index
                        }
                        style={{
                          position:
                            'relative',

                          width:
                            '90px',

                          height:
                            '90px',

                          overflow:
                            'hidden',

                          borderRadius:
                            '7px',

                          border:
                            '1px solid #cbd5e1',
                        }}
                      >
                        <img
                          src={
                            photo
                          }
                          alt={`Photo ${
                            index +
                            1
                          }`}
                          style={{
                            width:
                              '100%',

                            height:
                              '100%',

                            objectFit:
                              'cover',
                          }}
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removePhoto(
                              index
                            )
                          }
                          style={{
                            position:
                              'absolute',

                            top:
                              '3px',

                            right:
                              '3px',

                            width:
                              '22px',

                            height:
                              '22px',

                            borderRadius:
                              '50%',

                            border:
                              'none',

                            backgroundColor:
                              '#dc2626',

                            color:
                              '#fff',

                            cursor:
                              'pointer',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* ENREGISTRER */}

            <button
              type="submit"
              disabled={
                saving ||
                uploading
              }
              style={{
                backgroundColor:
                  '#2563eb',

                color:
                  '#ffffff',

                border:
                  'none',

                borderRadius:
                  '7px',

                padding:
                  '13px',

                fontSize:
                  '15px',

                fontWeight:
                  'bold',

                cursor:
                  saving ||
                  uploading
                    ? 'wait'
                    : 'pointer',

                opacity:
                  saving ||
                  uploading
                    ? 0.7
                    : 1,
              }}
            >
              {saving
                ? 'Enregistrement...'
                : 'Enregistrer les modifications'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

const labelStyle:
  React.CSSProperties = {
  display:
    'block',

  fontWeight:
    '600',

  fontSize:
    '14px',

  color:
    '#334155',

  marginBottom:
    '7px',
}

const inputStyle:
  React.CSSProperties = {
  width:
    '100%',

  padding:
    '10px 12px',

  borderRadius:
    '6px',

  border:
    '1px solid #cbd5e1',

  fontSize:
    '14px',

  boxSizing:
    'border-box',

  backgroundColor:
    '#ffffff',
}