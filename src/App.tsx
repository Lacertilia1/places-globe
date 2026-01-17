import { useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'globe.gl'
import { PLACES, type Place } from './data/places'

type GlobeInstance = InstanceType<typeof Globe>

type GlobePoint = Place & {
  label: string
  isCurrent: boolean
  isSelected: boolean
}

const MARKER_COLOR = '#ffcc00'
const SELECTED_MARKER_COLOR = '#38bdf8'
const RING_MAX_RADIUS = 1
const RING_PROPAGATION_SPEED = 1
const RING_REPEAT_PERIOD = 900

function App() {
  const [globeReady, setGlobeReady] = useState(false)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)

  const globeContainerRef = useRef<HTMLDivElement | null>(null)
  const globeRef = useRef<GlobeInstance | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!globeContainerRef.current || globeRef.current) return
    if (initializedRef.current) return
    initializedRef.current = true

    const container = globeContainerRef.current
    const globe = new Globe(container)
    globeRef.current = globe

    const controls = globe.controls()
    controls.enableZoom = true
    controls.zoomSpeed = 1.1
    controls.minDistance = 140
    controls.maxDistance = 1200
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.1

    globe
      .globeImageUrl(
        'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
      )
      .backgroundImageUrl(
        'https://unpkg.com/three-globe/example/img/night-sky.png',
      )
      .bumpImageUrl(
        'https://unpkg.com/three-globe/example/img/earth-topology.png',
      )
      .backgroundColor('#020617')
      .showAtmosphere(true)
      .atmosphereColor('#38bdf8')
      .atmosphereAltitude(0.22)
      .pointColor((datum: object) => {
        const point = datum as GlobePoint
        return point.isSelected ? SELECTED_MARKER_COLOR : MARKER_COLOR
      })
      .pointLabel((datum: object) => (datum as GlobePoint).label)


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
      const globeNow = globeRef.current
      if (!globeNow) return
      globeNow.pointsData(pointsData)
      if (typeof globeNow.ringsData === 'function') {
        globeNow.ringsData(ringsData)
      }
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

  const places = useMemo(
    () => [...PLACES].sort((a, b) => b.date.localeCompare(a.date)),
    [],
  )
  const currentPlace = places.length > 0 ? places[0] : null
  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) ?? null,
    [places, selectedPlaceId],
  )
  const basePointRadius = 0.25
  const currentPointRadius = 0.25
  const basePointAltitude = 0.1
  const currentPointAltitude = 0.12
  const selectedPointRadius = 0.25
  const selectedPointAltitude = 0.1
  const defaultCameraAltitude = 1.4
  const selectedCameraAltitude = 0.6
  const cameraDuration = 1100
  const lastCameraTargetRef = useRef<string | null>(null)

  useEffect(() => {
    if (!globeRef.current) return
    globeRef.current
      .pointRadius((datum: object) => {
        const point = datum as GlobePoint
        return point.isSelected
          ? selectedPointRadius
          : point.isCurrent
            ? currentPointRadius
            : basePointRadius
      })
      .pointAltitude((datum: object) => {
        const point = datum as GlobePoint
        return point.isSelected
          ? selectedPointAltitude
          : point.isCurrent
            ? currentPointAltitude
            : basePointAltitude
      })
  }, [
    basePointRadius,
    currentPointRadius,
    basePointAltitude,
    currentPointAltitude,
    selectedPointRadius,
    selectedPointAltitude,
  ])

  const pointsData = useMemo(
    () =>
      places.map((place) => {
        const isCurrent = currentPlace?.id === place.id
        const isSelected = selectedPlaceId === place.id
        return {
          ...place,
          label: `${place.title} — ${place.date}`,
          isCurrent,
          isSelected,
        }
      }),
    [places, currentPlace, selectedPlaceId],
  )

  const ringsData = useMemo(() => pointsData, [pointsData])

  useEffect(() => {
    if (!globeRef.current) return
    globeRef.current
      .pointColor((datum: object) => {
        const point = datum as GlobePoint
        return point.isSelected ? SELECTED_MARKER_COLOR : MARKER_COLOR
      })
      .pointsData(pointsData)
  }, [pointsData])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return
    if (typeof globe.ringsData !== 'function') return
    globe
      .ringLat((datum: object) => (datum as GlobePoint).lat)
      .ringLng((datum: object) => (datum as GlobePoint).lng)
      .ringColor((datum: object) => {
        const point = datum as GlobePoint
        return point.isSelected ? SELECTED_MARKER_COLOR : MARKER_COLOR
      })
      .ringMaxRadius(() => RING_MAX_RADIUS)
      .ringPropagationSpeed(() => RING_PROPAGATION_SPEED)
      .ringRepeatPeriod(() => RING_REPEAT_PERIOD)
    globe.ringsData(ringsData)
  }, [ringsData])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !globeReady) return

    if (selectedPlace) {
      const targetKey = `selected:${selectedPlace.id}`
      if (lastCameraTargetRef.current === targetKey) return
      lastCameraTargetRef.current = targetKey
      globe.pointOfView(
        {
          lat: selectedPlace.lat,
          lng: selectedPlace.lng,
          altitude: selectedCameraAltitude,
        },
        cameraDuration,
      )
      return
    }

    if (currentPlace) {
      const targetKey = `current:${currentPlace.id}`
      if (lastCameraTargetRef.current === targetKey) return
      lastCameraTargetRef.current = targetKey
      globe.pointOfView(
        {
          lat: currentPlace.lat,
          lng: currentPlace.lng,
          altitude: defaultCameraAltitude,
        },
        cameraDuration,
      )
    }
  }, [
    selectedPlace,
    currentPlace,
    defaultCameraAltitude,
    selectedCameraAltitude,
    cameraDuration,
    globeReady,
  ])

  const panelStyle: React.CSSProperties = {
    width: '400px',
    minWidth: '380px',
    maxWidth: '420px',
    background: '#0f172a',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 20px',
    boxShadow: '12px 0 30px rgba(15, 23, 42, 0.55)',
    boxSizing: 'border-box',
  }

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
          .places-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
          }
          .places-scroll::-webkit-scrollbar {
            width: 8px;
          }
          .places-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .places-scroll::-webkit-scrollbar-thumb {
            background-color: rgba(148, 163, 184, 0.4);
            border-radius: 999px;
            border: 2px solid transparent;
            background-clip: content-box;
          }
          .places-scroll::-webkit-scrollbar-thumb:hover {
            background-color: rgba(148, 163, 184, 0.6);
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
            Хронология
          </p>
          <h1 style={{ margin: '8px 0 6px', fontSize: '28px' }}>
            Мой маршрут
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: 'rgba(226, 232, 240, 0.7)',
            }}
          >
            Где я жил и куда переезжал. Последняя точка — где я сейчас.
          </p>
          {selectedPlaceId && (
            <button
              type="button"
              onClick={() => setSelectedPlaceId(null)}
              style={{
                marginTop: '14px',
                padding: '6px 10px',
                borderRadius: '999px',
                border: '1px solid rgba(148, 163, 184, 0.35)',
                background: 'transparent',
                color: 'rgba(226, 232, 240, 0.8)',
                fontSize: '12px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Сбросить выбор
            </button>
          )}
        </div>

        <div
          className="places-scroll"
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(148, 163, 184, 0.15)',
            flex: 1,
            overflowY: 'auto',
            paddingRight: '12px',
            position: 'relative',
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
            <h2 style={{ margin: 0, fontSize: '18px' }}>Маршрут</h2>
            <span
              style={{
                fontSize: '12px',
                color: 'rgba(226, 232, 240, 0.65)',
              }}
            >
              {places.length} мест
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
              Пока пусто.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {places.map((place) => {
                const isCurrent = currentPlace?.id === place.id
                const isSelected = selectedPlaceId === place.id
                return (
                <div
                  key={place.id}
                  onClick={() =>
                    setSelectedPlaceId((value) =>
                      value === place.id ? null : place.id,
                    )
                  }
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: isSelected
                      ? '1px solid rgba(56, 189, 248, 0.7)'
                      : '1px solid rgba(148, 163, 184, 0.2)',
                    background: isSelected
                      ? 'rgba(56, 189, 248, 0.12)'
                      : 'rgba(15, 23, 42, 0.75)',
                    boxShadow: '0 10px 20px rgba(2, 6, 23, 0.35)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{place.title}</div>
                    {isCurrent && (
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '6px',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: 'rgba(52, 211, 153, 0.2)',
                          color: '#d1fae5',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}
                      >
                        Сейчас
                      </span>
                    )}
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
                </div>
                )
              })}
            </div>
          )}
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              left: 0,
              right: 0,
              height: '28px',
              pointerEvents: 'none',
              background:
                'linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.95) 100%)',
            }}
          />
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
