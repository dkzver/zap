import { useCallback, useEffect, useRef, useState } from 'react';
import { HudOverlay } from './components/HudOverlay';
import { ForkliftWorld } from './game/ForkliftWorld';
import { CameraMode, ControlInputs, ForkliftTelemetry } from './game/types';

const INITIAL_TELEMETRY: ForkliftTelemetry = {
  speedKmh: 0,
  forkHeightMeters: 0.14,
  carryingTitle: null,
  deliveredCount: 0,
  totalCargoCount: 6,
  headlightsOn: true,
  reverseActive: false,
  cameraMode: 'chase',
  shiftCompleted: false,
  nearDropZone: false,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<ForkliftWorld | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [telemetry, setTelemetry] = useState<ForkliftTelemetry>(INITIAL_TELEMETRY);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [webglError, setWebglError] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    try {
      const world = new ForkliftWorld(container, {
        onTelemetry: (data) => setTelemetry(data),
        onEventToast: (msg) => showToast(msg),
        onContextLost: () => setWebglError(true),
      });
      worldRef.current = world;
    } catch {
      setWebglError(true);
    }

    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      worldRef.current?.dispose();
      worldRef.current = null;
    };
  }, [showToast]);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      worldRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const handleCameraChange = useCallback((mode: CameraMode) => {
    worldRef.current?.setCameraMode(mode);
  }, []);

  const handleToggleHeadlights = useCallback(() => {
    worldRef.current?.toggleHeadlights();
  }, []);

  const handleHorn = useCallback(() => {
    worldRef.current?.triggerHorn();
  }, []);

  const handleDropCargo = useCallback(() => {
    worldRef.current?.dropCarriedCargoInPlace();
  }, []);

  const handleResetPosition = useCallback(() => {
    worldRef.current?.resetForkliftPosition();
  }, []);

  const handleResetShift = useCallback(() => {
    worldRef.current?.resetAllCargo();
  }, []);

  const handleControlInput = useCallback((key: keyof ControlInputs, active: boolean) => {
    worldRef.current?.setUiInput(key, active);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {/* Dedicated isolated WebGL canvas container */}
      <div ref={mountRef} className="h-full w-full" />

      {webglError ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950 p-6 text-center">
          <div className="max-w-md rounded-xl border border-white/15 bg-slate-900 p-6">
            <h2 className="font-display text-xl font-semibold text-amber-400">
              WebGL недоступен
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Не удалось инициализировать 3D-рендерер. Проверьте поддержку аппаратного ускорения в браузере и перезагрузите страницу.
            </p>
          </div>
        </div>
      ) : (
        <HudOverlay
          telemetry={telemetry}
          toastMessage={toastMessage}
          muted={muted}
          onToggleMute={handleToggleMute}
          onCameraChange={handleCameraChange}
          onToggleHeadlights={handleToggleHeadlights}
          onHorn={handleHorn}
          onDropCargo={handleDropCargo}
          onResetPosition={handleResetPosition}
          onResetShift={handleResetShift}
          onControlInput={handleControlInput}
        />
      )}
    </main>
  );
}
