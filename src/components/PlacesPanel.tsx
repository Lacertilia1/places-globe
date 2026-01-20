import { useEffect, useRef, useState } from "react";
import "../styles/places-panel.css";
import type { Place } from "../data/places";

type PlacesPanelProps = {
  places: Place[];
  currentPlace: Place | null;
  selectedPlaceId: string | null;
  onSelectPlace: (id: string | null) => void;
};

function PlacesPanel({
  places,
  currentPlace,
  selectedPlaceId,
  onSelectPlace,
}: PlacesPanelProps) {
  const [hasScrolled, setHasScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedPlaceId) return;
    const container = scrollRef.current;
    const item = itemRefs.current[selectedPlaceId];
    if (!container || !item) return;
    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const offset = itemRect.top - containerRect.top;
    const target =
      container.scrollTop +
      offset -
      (container.clientHeight / 2 - itemRect.height / 2);
    if (scrollFrameRef.current != null) {
      cancelAnimationFrame(scrollFrameRef.current);
    }
    const startTop = container.scrollTop;
    const delta = target - startTop;
    const duration = 550;
    const start = performance.now();
    const easeInOut = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const animate = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeInOut(progress);
      container.scrollTop = startTop + delta * eased;
      if (progress < 1) {
        scrollFrameRef.current = requestAnimationFrame(animate);
      } else {
        scrollFrameRef.current = null;
      }
    };
    scrollFrameRef.current = requestAnimationFrame(animate);
  }, [selectedPlaceId]);

  return (
    <aside className="places-panel">
      <div className="places-panel__header">
        <p className="places-panel__kicker">Хронология</p>
        <h1 className="places-panel__title">Мой маршрут</h1>
        <p className="places-panel__subtitle">Где я жил и куда переезжал</p>
        {selectedPlaceId && (
          <button
            type="button"
            className="places-panel__reset"
            onClick={() => onSelectPlace(null)}
          >
            Сбросить выбор
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="places-panel__scroll"
        onScroll={(event) => {
          const target = event.currentTarget;
          setHasScrolled(target.scrollTop > 1);
        }}
      >
        <div
          className={`places-panel__fade places-panel__fade--top${
            hasScrolled ? " is-visible" : ""
          }`}
        />
        <div className="places-panel__section-head">
          <h2 className="places-panel__section-title">Маршрут</h2>
          <span className="places-panel__count">{places.length} мест</span>
        </div>

        {places.length === 0 ? (
          <div className="places-panel__empty">Пока пусто.</div>
        ) : (
          <div className="places-panel__grid">
            {places.map((place) => {
              const isCurrent = currentPlace?.id === place.id;
              const isSelected = selectedPlaceId === place.id;
              return (
                <div
                  key={place.id}
                  onClick={() =>
                    onSelectPlace(selectedPlaceId === place.id ? null : place.id)
                  }
                  ref={(element) => {
                    itemRefs.current[place.id] = element;
                  }}
                  className={`places-panel__item${
                    isSelected ? " places-panel__item--selected" : ""
                  }`}
                >
                  <div>
                    <div className="places-panel__place-title">
                      {place.title}
                    </div>
                    {isCurrent && (
                      <span className="places-panel__badge">Сейчас</span>
                    )}
                    <div className="places-panel__meta">{place.date}</div>
                    <div className="places-panel__coords">
                      {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="places-panel__fade places-panel__fade--bottom" />
      </div>
    </aside>
  );
}

export default PlacesPanel;
