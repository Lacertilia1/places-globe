import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "globe.gl";
import * as THREE from "three";
import "../styles/globe-scene.css";
import {
  AUTO_ROTATE_DISTANCE,
  AUTO_ROTATE_SPEED,
  EARTH_TEXTURE_HIGH,
  EARTH_TEXTURE_LOW,
  MARKER_COLOR,
  MAX_ZOOM_DISTANCE,
  MOON_DISTANCE_MULTIPLIER,
  MOON_RADIUS_MULTIPLIER,
  MOON_TEXTURE,
  RING_MAX_RADIUS,
  RING_PROPAGATION_SPEED,
  RING_REPEAT_PERIOD,
  SELECTED_MARKER_COLOR,
} from "../config/globe";
import type { Place } from "../data/places";

type GlobeInstance = InstanceType<typeof Globe>;

type GlobePoint = Place & {
  label: string;
  isCurrent: boolean;
  isSelected: boolean;
};

type GlobeSceneProps = {
  places: Place[];
  currentPlace: Place | null;
  selectedPlaceId: string | null;
  selectedPlace: Place | null;
};

function GlobeScene({
  places,
  currentPlace,
  selectedPlaceId,
  selectedPlace,
}: GlobeSceneProps) {
  const [globeReady, setGlobeReady] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);

  const globeContainerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const controlsRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const moonRef = useRef<THREE.Mesh | null>(null);
  const moonLabelRef = useRef<THREE.Sprite | null>(null);

  const pointsData = useMemo(
    () =>
      places.map((place) => {
        const isCurrent = currentPlace?.id === place.id;
        const isSelected = selectedPlaceId === place.id;
        return {
          ...place,
          label: `${place.title} — ${place.date}`,
          isCurrent,
          isSelected,
        };
      }),
    [places, currentPlace, selectedPlaceId],
  );

  const ringsData = useMemo(() => pointsData, [pointsData]);

  useEffect(() => {
    if (!globeContainerRef.current || globeRef.current) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    const container = globeContainerRef.current;
    const globe = new Globe(container);
    globeRef.current = globe;

    const controls = globe.controls();
    controls.enableZoom = true;
    controls.zoomSpeed = 1.1;
    controls.minDistance = 140;
    controls.maxDistance = MAX_ZOOM_DISTANCE;
    controls.enablePan = false;
    controls.enableDamping = false;
    controlsRef.current = controls;

    if (typeof globe.renderer === "function") {
      globe.renderer().setPixelRatio(1);
    }

    globe
      .globeImageUrl(EARTH_TEXTURE_LOW)
      .backgroundImageUrl("/textures/stars.webp")
      .backgroundColor("#020617")
      .showAtmosphere(true)
      .atmosphereColor("#38bdf8")
      .atmosphereAltitude(0.22)
      .pointColor((datum: object) => {
        const point = datum as GlobePoint;
        return point.isSelected ? SELECTED_MARKER_COLOR : MARKER_COLOR;
      })
      .pointLabel((datum: object) => (datum as GlobePoint).label);

    const globeRadius = globe.getGlobeRadius();
    const createLabelSprite = (text: string, scale: number) => {
      const labelCanvas = document.createElement("canvas");
      labelCanvas.width = 256;
      labelCanvas.height = 128;
      const labelContext = labelCanvas.getContext("2d");
      if (labelContext) {
        labelContext.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
        labelContext.font = "bold 48px Trebuchet MS, sans-serif";
        labelContext.fillStyle = "#e2e8f0";
        labelContext.textAlign = "center";
        labelContext.textBaseline = "middle";
        labelContext.fillText(
          text,
          labelCanvas.width / 2,
          labelCanvas.height / 2,
        );
      }
      const labelTexture = new THREE.CanvasTexture(labelCanvas);
      const labelMaterial = new THREE.SpriteMaterial({
        map: labelTexture,
        transparent: true,
        depthTest: false,
      });
      const labelSprite = new THREE.Sprite(labelMaterial);
      labelSprite.scale.set(scale, scale * 0.5, 1);
      return labelSprite;
    };

    const moonRadius = globeRadius * MOON_RADIUS_MULTIPLIER;
    const moonDistance = globeRadius * MOON_DISTANCE_MULTIPLIER;
    const moonGeometry = new THREE.SphereGeometry(moonRadius, 48, 48);
    const moonMaterial = new THREE.MeshPhongMaterial({
      color: "#cbd5f5",
      shininess: 5,
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(moonDistance, 0, 0);
    moonRef.current = moon;
    globe.scene().add(moon);

    const moonLabel = createLabelSprite("Луна", globeRadius * 6);
    moonLabel.position.set(moonDistance, moonRadius * 3.2, 0);
    moonLabelRef.current = moonLabel;
    globe.scene().add(moonLabel);

    const moonTexture = new THREE.TextureLoader().load(MOON_TEXTURE, () => {
      if (!moonRef.current) return;
      moonMaterial.map = moonTexture;
      moonMaterial.needsUpdate = true;
    });

    const highResImage = new Image();
    highResImage.crossOrigin = "anonymous";
    highResImage.src = EARTH_TEXTURE_HIGH;
    highResImage.onload = () => {
      if (globeRef.current) {
        globeRef.current.globeImageUrl(EARTH_TEXTURE_HIGH);
      }
    };

    const doResize = () => {
      const container = globeContainerRef.current;
      if (!container || !globeRef.current) return;
      const { width, height } = container.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      globeRef.current.width(width);
      globeRef.current.height(height);
      if (!globeReady) {
        setGlobeReady(true);
      }
    };

    const observer = new ResizeObserver(() => {
      doResize();
    });

    observer.observe(container);
    requestAnimationFrame(() => {
      doResize();
      const globeNow = globeRef.current;
      if (!globeNow) return;
      globeNow.pointsData(pointsData);
      if (typeof globeNow.ringsData === "function") {
        globeNow.ringsData(ringsData);
      }
    });

    return () => {
      observer.disconnect();
      if (globeContainerRef.current) {
        globeContainerRef.current.innerHTML = "";
      }
      if (moonRef.current) {
        globe.scene().remove(moonRef.current);
        moonRef.current.geometry.dispose();
        if (Array.isArray(moonRef.current.material)) {
          moonRef.current.material.forEach((material: THREE.Material) =>
            material.dispose(),
          );
        } else {
          moonRef.current.material.dispose();
        }
        moonRef.current = null;
      }
      if (moonLabelRef.current) {
        globe.scene().remove(moonLabelRef.current);
        moonLabelRef.current.material.map?.dispose();
        moonLabelRef.current.material.dispose();
        moonLabelRef.current = null;
      }
      globeRef.current = null;
      initializedRef.current = false;
      setGlobeReady(false);
    };
  }, [globeReady, pointsData, ringsData]);

  useEffect(() => {
    let frame = 0;
    const updateAutoRotate = () => {
      const controls = controlsRef.current;
      if (controls) {
        const distance =
          typeof controls.getDistance === "function"
            ? controls.getDistance()
            : null;
        const shouldRotate = distance != null && distance > AUTO_ROTATE_DISTANCE;
        controls.autoRotate = shouldRotate;
        controls.autoRotateSpeed = AUTO_ROTATE_SPEED;
        const globe = globeRef.current;
        const moonLabel = moonLabelRef.current;
        const moon = moonRef.current;
        if (globe && moonLabel && moon) {
          const camera = globe.camera?.();
          if (camera) {
            const cameraPosition = new THREE.Vector3();
            const moonPosition = new THREE.Vector3();
            camera.getWorldPosition(cameraPosition);
            moon.getWorldPosition(moonPosition);
            const toMoon = moonPosition.clone().sub(cameraPosition);
            const a = toMoon.dot(toMoon);
            const b = 2 * cameraPosition.dot(toMoon);
            const radius = globe.getGlobeRadius();
            const c = cameraPosition.dot(cameraPosition) - radius * radius;
            const disc = b * b - 4 * a * c;
            let occluded = false;
            if (disc > 0) {
              const sqrt = Math.sqrt(disc);
              const t1 = (-b - sqrt) / (2 * a);
              const t2 = (-b + sqrt) / (2 * a);
              occluded =
                (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
            }
            moonLabel.visible = !occluded;
          }
        }
      }
      frame = requestAnimationFrame(updateAutoRotate);
    };
    frame = requestAnimationFrame(updateAutoRotate);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    fetch("/geo/countries.geojson")
      .then((response) => response.json())
      .then((data) => setCountries(data?.features ?? []))
      .catch(() => setCountries([]));
  }, []);

  const basePointRadius = 0.25;
  const currentPointRadius = 0.25;
  const basePointAltitude = 0.1;
  const currentPointAltitude = 0.12;
  const selectedPointRadius = 0.25;
  const selectedPointAltitude = 0.1;
  const defaultCameraAltitude = 1.5;
  const selectedCameraAltitude = 0.6;
  const cameraDuration = 1100;
  const lastCameraTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current
      .pointRadius((datum: object) => {
        const point = datum as GlobePoint;
        return point.isSelected
          ? selectedPointRadius
          : point.isCurrent
            ? currentPointRadius
            : basePointRadius;
      })
      .pointAltitude((datum: object) => {
        const point = datum as GlobePoint;
        return point.isSelected
          ? selectedPointAltitude
          : point.isCurrent
            ? currentPointAltitude
            : basePointAltitude;
      });
  }, [
    basePointRadius,
    currentPointRadius,
    basePointAltitude,
    currentPointAltitude,
    selectedPointRadius,
    selectedPointAltitude,
  ]);

  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current
      .pointColor((datum: object) => {
        const point = datum as GlobePoint;
        return point.isSelected ? SELECTED_MARKER_COLOR : MARKER_COLOR;
      })
      .pointsData(pointsData);
  }, [pointsData]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    if (typeof globe.ringsData !== "function") return;
    globe
      .ringLat((datum: object) => (datum as GlobePoint).lat)
      .ringLng((datum: object) => (datum as GlobePoint).lng)
      .ringColor((datum: object) => {
        const point = datum as GlobePoint;
        return point.isSelected ? SELECTED_MARKER_COLOR : MARKER_COLOR;
      })
      .ringMaxRadius(() => RING_MAX_RADIUS)
      .ringPropagationSpeed(() => RING_PROPAGATION_SPEED)
      .ringRepeatPeriod(() => RING_REPEAT_PERIOD);
    globe.ringsData(ringsData);
  }, [ringsData]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe
      .polygonsData(countries)
      .polygonCapColor(() => "rgba(0,0,0,0)")
      .polygonSideColor(() => "rgba(0,0,0,0)")
      .polygonStrokeColor(() => "rgba(255,255,255,0.45)")
      .polygonAltitude(0.0015)
      .polygonLabel((datum: any) => datum?.properties?.name ?? "");
  }, [countries]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !globeReady) return;

    if (selectedPlace) {
      const targetKey = `selected:${selectedPlace.id}`;
      if (lastCameraTargetRef.current === targetKey) return;
      lastCameraTargetRef.current = targetKey;
      globe.pointOfView(
        {
          lat: selectedPlace.lat,
          lng: selectedPlace.lng,
          altitude: selectedCameraAltitude,
        },
        cameraDuration,
      );
      return;
    }

    if (currentPlace) {
      const targetKey = `current:${currentPlace.id}`;
      if (lastCameraTargetRef.current === targetKey) return;
      lastCameraTargetRef.current = targetKey;
      globe.pointOfView(
        {
          lat: currentPlace.lat,
          lng: currentPlace.lng,
          altitude: defaultCameraAltitude,
        },
        cameraDuration,
      );
    }
  }, [
    selectedPlace,
    currentPlace,
    defaultCameraAltitude,
    selectedCameraAltitude,
    cameraDuration,
    globeReady,
  ]);

  return (
    <section className="globe-scene">
      {!globeReady && <div className="globe-scene__loader">Loading globe…</div>}
      <div ref={globeContainerRef} className="globe-scene__canvas" />
    </section>
  );
}

export default GlobeScene;
