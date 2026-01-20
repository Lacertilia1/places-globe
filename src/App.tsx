import { useEffect, useMemo, useState } from "react";
import GlobeScene from "./components/GlobeScene";
import PlacesPanel from "./components/PlacesPanel";
import { PLACES } from "./data/places";
import "./styles/app.css";

function App() {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedPlaceId((value) => (value ? null : value));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const places = useMemo(
    () => [...PLACES].sort((a, b) => b.date.localeCompare(a.date)),
    [],
  );
  const currentPlace = places.length > 0 ? places[0] : null;
  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) ?? null,
    [places, selectedPlaceId],
  );

  return (
    <div className="app">
      <PlacesPanel
        places={places}
        currentPlace={currentPlace}
        selectedPlaceId={selectedPlaceId}
        onSelectPlace={setSelectedPlaceId}
      />
      <GlobeScene
        places={places}
        currentPlace={currentPlace}
        selectedPlaceId={selectedPlaceId}
        selectedPlace={selectedPlace}
      />
    </div>
  );
}

export default App;
