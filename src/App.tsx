import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import Globe from 'globe.gl'

type Place = {
  id: string
  title: string
  date: string
  lat: number
  lng: number
}

type GlobePoint = Place & { label: string }

const STORAGE_KEY = 'places_globe_v1'

const parsePlaces = (raw: string | null): Place[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => ({
        id: String(item?.id ?? ''),
        title: String(item?.title ?? ''),
        date: String(item?.date ?? ''),
        lat: Number(item?.lat),
        lng: Number(item?.lng),
      }))
      .filter(
        (item) =>
          item.id &&
          item.title &&
          item.date &&
          Number.isFinite(item.lat) &&
          Number.isFinite(item.lng),
      )
  } catch {
    return []
  }
}

function App() {
  const [places, setPlaces] = useState<Place[]>(() => {
    try {
      return parsePlaces(localStorage.getItem(STORAGE_KEY))
    } catch {
      return []
    }
  })
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => {
    const today = new Date()
    return today.toISOString().slice(0, 10)
  })
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [addHover, setAddHover] = useState(false)
  const [hoverDeleteId, setHoverDeleteId] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [globeReady, setGlobeReady] = useState(false)

  const globeContainerRef = useRef<HTMLDivElement | null>(null)
  const globeRef = useRef<ReturnType<typeof Globe> | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(places))
    } catch {
      // Ignore storage write failures (private mode, quotas, etc.)
    }
  }, [places])

  useEffect(() => {
    if (!globeContainerRef.current || globeRef.current) return
    if (initializedRef.current) return
    initializedRef.current = true

    const container = globeContainerRef.current
    const globe = Globe()(container)
    globeRef.current = globe

    globe
      .globeImageUrl(
        'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
      )
      .bumpImageUrl(
        'https://unpkg.com/three-globe/example/img/earth-topology.png',
      )
      .backgroundColor('#020617')
      .showAtmosphere(true)
      .atmosphereColor('#38bdf8')
      .pointRadius(0.9)
      .pointAltitude(0.05)
      .pointColor(() => '#ffcc00')
      .pointLabel((datum: GlobePoint) => datum.label)


    const doResize = () => {
      const container = globeContainerRef.current
      if (!container || !globeRef.current) return
      const { width, height } = container.getBoundingClientRect()
      if (width <= 0 || height <= 0) return
      globeRef.current.width(width)
      globeRef.current.height(height)
      if (!globeReady) {
        setGlobeReady(true)
      }
    }

    const observer = new ResizeObserver(() => {
      doResize()
    })

    observer.observe(container)
    requestAnimationFrame(() => {
      doResize()
    })

    return () => {
      observer.disconnect()
      if (globeContainerRef.current) {
        globeContainerRef.current.innerHTML = ''
      }
      globeRef.current = null
      initializedRef.current = false
      setGlobeReady(false)
    }
  }, [])

  const pointsData = useMemo<GlobePoint[]>(
    () =>
      places.map((place) => ({
        ...place,
        label: `${place.title} — ${place.date}`,
      })),
    [places],
  )

  useEffect(() => {
    if (!globeRef.current) return
    globeRef.current.pointsData(pointsData)
  }, [pointsData])

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      alert('Please enter a title for the place.')
      return
    }
    if (!date.trim()) {
      alert('Please select a date.')
      return
    }

    const latValue = Number(lat)
    const lngValue = Number(lng)
    if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) {
      alert('Latitude and longitude must be numbers.')
      return
    }
    if (latValue < -90 || latValue > 90) {
      alert('Latitude must be between -90 and 90.')
      return
    }
    if (lngValue < -180 || lngValue > 180) {
      alert('Longitude must be between -180 and 180.')
      return
    }

    const nextPlace: Place = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: trimmedTitle,
      date: date.trim(),
      lat: latValue,
      lng: lngValue,
    }

    setPlaces((prev) => [nextPlace, ...prev])
    setTitle('')
  }

  const handleDelete = (id: string) => {
    setPlaces((prev) => prev.filter((place) => place.id !== id))
  }

  const panelStyle: React.CSSProperties = {
    width: '400px',
    minWidth: '380px',
    maxWidth: '420px',
    background: '#0f172a',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    padding: '28px 30px 24px 26px',
    boxShadow: '12px 0 30px rgba(15, 23, 42, 0.55)',
    boxSizing: 'border-box',
  }

  const inputBaseStyle: React.CSSProperties = {
    width: '100%',
    height: '40px',
    borderRadius: '10px',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    background: 'rgba(15, 23, 42, 0.6)',
    color: '#e2e8f0',
    padding: '0 12px',
    boxSizing: 'border-box',
    outline: '2px solid transparent',
    outlineOffset: '2px',
    transition: 'border 0.15s ease, outline 0.15s ease',
  }

  const focusOutline = (field: string) =>
    focusedField === field ? '2px solid rgba(56, 189, 248, 0.7)' : undefined

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignSelf: 'stretch',
        background: 'linear-gradient(135deg, #0b1120 0%, #020617 60%)',
        fontFamily:
          '"Trebuchet MS", "Lucida Grande", "Segoe UI", sans-serif',
        color: '#e2e8f0',
        overflow: 'hidden',
      }}
    >
      <style>
        {`
          html, body, #root {
            width: 100%;
            height: 100%;
            margin: 0;
          }
          body {
            overflow: hidden;
          }
        `}
      </style>
      <aside style={panelStyle}>
        <div style={{ marginBottom: '22px' }}>
          <p
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              fontSize: '11px',
              color: 'rgba(226, 232, 240, 0.65)',
              margin: 0,
            }}
          >
            My places on the globe
          </p>
          <h1 style={{ margin: '8px 0 6px', fontSize: '28px' }}>
            Places Logbook
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: 'rgba(226, 232, 240, 0.7)',
            }}
          >
            Save locations and see them on the globe.
          </p>
        </div>

        <form onSubmit={handleAdd} style={{ display: 'grid', gap: '12px' }}>
          <label style={{ fontSize: '12px', color: 'rgba(226,232,240,0.7)' }}>
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onFocus={() => setFocusedField('title')}
              onBlur={() =>
                setFocusedField((current) =>
                  current === 'title' ? null : current,
                )
              }
              style={{
                ...inputBaseStyle,
                marginTop: '6px',
                outline: focusOutline('title'),
              }}
              placeholder="Lisbon, Portugal"
            />
          </label>
          <label style={{ fontSize: '12px', color: 'rgba(226,232,240,0.7)' }}>
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              onFocus={() => setFocusedField('date')}
              onBlur={() =>
                setFocusedField((current) =>
                  current === 'date' ? null : current,
                )
              }
              style={{
                ...inputBaseStyle,
                marginTop: '6px',
                outline: focusOutline('date'),
              }}
            />
          </label>
          <div
            style={{
              display: 'grid',
              gap: '12px',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            }}
          >
            <label
              style={{
                fontSize: '12px',
                color: 'rgba(226,232,240,0.7)',
                display: 'block',
              }}
            >
              Latitude
              <input
                value={lat}
                onChange={(event) => setLat(event.target.value)}
                onFocus={() => setFocusedField('lat')}
                onBlur={() =>
                  setFocusedField((current) =>
                    current === 'lat' ? null : current,
                  )
                }
                style={{
                  ...inputBaseStyle,
                  marginTop: '6px',
                  outline: focusOutline('lat'),
                }}
                placeholder="38.72"
              />
            </label>
            <label
              style={{
                fontSize: '12px',
                color: 'rgba(226,232,240,0.7)',
                display: 'block',
              }}
            >
              Longitude
              <input
                value={lng}
                onChange={(event) => setLng(event.target.value)}
                onFocus={() => setFocusedField('lng')}
                onBlur={() =>
                  setFocusedField((current) =>
                    current === 'lng' ? null : current,
                  )
                }
                style={{
                  ...inputBaseStyle,
                  marginTop: '6px',
                  outline: focusOutline('lng'),
                }}
                placeholder="-9.14"
              />
            </label>
          </div>
          <button
            type="submit"
            onMouseEnter={() => setAddHover(true)}
            onMouseLeave={() => setAddHover(false)}
            style={{
              height: '42px',
              borderRadius: '12px',
              border: '1px solid rgba(56, 189, 248, 0.5)',
              background: addHover ? '#0ea5e9' : '#0284c7',
              color: '#0b1120',
              fontWeight: 600,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              transition: 'background 0.15s ease, transform 0.1s ease',
              transform: addHover ? 'translateY(-1px)' : 'translateY(0)',
            }}
          >
            Add place
          </button>
        </form>

        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(148, 163, 184, 0.15)',
            flex: 1,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '18px' }}>Places</h2>
            <span
              style={{
                fontSize: '12px',
                color: 'rgba(226, 232, 240, 0.65)',
              }}
            >
              {places.length} saved
            </span>
          </div>

          {places.length === 0 ? (
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: '1px dashed rgba(148, 163, 184, 0.3)',
                color: 'rgba(226, 232, 240, 0.7)',
                fontSize: '14px',
              }}
            >
              Nothing yet. Add your first place.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {places.map((place) => (
                <div
                  key={place.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.75)',
                    boxShadow: '0 10px 20px rgba(2, 6, 23, 0.35)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{place.title}</div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'rgba(226, 232, 240, 0.7)',
                        marginTop: '4px',
                      }}
                    >
                      {place.date}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'rgba(148, 163, 184, 0.8)',
                        marginTop: '6px',
                      }}
                    >
                      {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onMouseEnter={() => setHoverDeleteId(place.id)}
                    onMouseLeave={() => setHoverDeleteId(null)}
                    onClick={() => handleDelete(place.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color:
                        hoverDeleteId === place.id
                          ? '#f97316'
                          : 'rgba(248, 250, 252, 0.7)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: 0,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <section
        style={{
          flex: 1,
          position: 'relative',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {!globeReady && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(226, 232, 240, 0.7)',
              fontSize: '14px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Loading globe…
          </div>
        )}
        <div
          ref={globeContainerRef}
          style={{
            position: 'absolute',
            inset: 0,
          }}
        />
      </section>
    </div>
  )
}

export default App
