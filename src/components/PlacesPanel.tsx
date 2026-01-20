import { useState } from "react";
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
