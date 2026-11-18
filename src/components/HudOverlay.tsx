import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Camera,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CameraMode, ControlInputs, ForkliftTelemetry } from '../game/types';

interface HudOverlayProps {
  telemetry: ForkliftTelemetry;
  toastMessage: string | null;
  muted: boolean;
  onToggleMute: () => void;
  onCameraChange: (mode: CameraMode) => void;
  onToggleHeadlights: () => void;
  onHorn: () => void;
  onDropCargo: () => void;
  onResetPosition: () => void;
  onResetShift: () => void;
  onControlInput: (key: keyof ControlInputs, active: boolean) => void;
}

const CAMERA_MODES: Array<{ id: CameraMode; label: string }> = [
  { id: 'chase', label: 'За машиной' },
  { id: 'close', label: 'Ближе' },
  { id: 'cabin', label: 'Кабина' },
  { id: 'orbit', label: 'Обзор' },
];

export const HudOverlay: React.FC<HudOverlayProps> = ({
  telemetry,
  toastMessage,
  muted,
  onToggleMute,
  onCameraChange,
  onToggleHeadlights,
  onHorn,
  onDropCargo,
  onResetPosition,
  onResetShift,
  onControlInput,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTouchPad, setShowTouchPad] = useState(false);

  const holdProps = (key: keyof ControlInputs) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      onControlInput(key, true);
    },
    onPointerUp: () => onControlInput(key, false),
    onPointerLeave: () => onControlInput(key, false),
    onPointerCancel: () => onControlInput(key, false),
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-5">
      {/* Top Row: Minimal Telemetry Header (Left) + Controls Help Trigger (Right) */}
      <div className="flex items-start justify-between gap-4">
        <div
          className="pointer-events-auto rounded-lg border border-white/10 px-4 py-2.5 shadow-lg"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.86)' }}
        >
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-lg font-semibold tracking-wide text-amber-400">
              АВТОРАЗБОРКА
            </h1>
            <span className="text-xs text-slate-400">20FT Контейнеры · Погрузчик</span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-200 font-mono-num">
            <span>
              Грузы: <strong className="text-white">{telemetry.deliveredCount}/{telemetry.totalCargoCount}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span>
              Скорость: <strong className="text-white">{telemetry.speedKmh}</strong> км/ч
            </span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span>
              Вилы: <strong className="text-white">{telemetry.forkHeightMeters.toFixed(2)}</strong> м
            </span>
            {telemetry.reverseActive && (
              <>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span className="font-semibold text-amber-400">ЗАДНИЙ ХОД</span>
              </>
            )}
          </div>

          <div className="mt-1.5 text-xs text-slate-300">
            {telemetry.shiftCompleted ? (
              <span className="text-emerald-400 font-medium">
                Все грузы доставлены в зону погрузки. Можно свободно кататься по территории.
              </span>
            ) : telemetry.carryingTitle ? (
              telemetry.nearDropZone ? (
                <span className="text-emerald-400 font-medium">
                  В зоне погрузки — опустите вилы (Q), чтобы выгрузить «{telemetry.carryingTitle}»
                </span>
              ) : (
                <span className="text-amber-300">
                  На вилах: {telemetry.carryingTitle} — везите к жёлтой зоне у контейнеров
                </span>
              )
            ) : (
              <span className="text-slate-400">
                Подъедьте низкими вилами под любой поддон с запчастями, затем поднимите (E)
              </span>
            )}
          </div>
        </div>

        {/* Top-Right Compact Action Pair */}
        <div className="pointer-events-auto flex items-center gap-2">
          {telemetry.shiftCompleted && (
            <button
              type="button"
              onClick={onResetShift}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-400/30 px-3 py-2 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-950/80 cursor-pointer whitespace-nowrap"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)' }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Новая смена
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowTouchPad((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              showTouchPad
                ? 'border-amber-400/60 text-amber-300'
                : 'border-white/10 text-slate-200 hover:text-white'
            }`}
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.86)' }}
            title="Экранные кнопки вождения"
          >
            <Gamepad2 className="h-4 w-4" />
            <span className="hidden sm:inline">Педали</span>
          </button>
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              showHelp
                ? 'border-amber-400/60 text-amber-300'
                : 'border-white/10 text-slate-200 hover:text-white'
            }`}
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.86)' }}
          >
            <HelpCircle className="h-4 w-4" />
            <span>Управление</span>
          </button>
        </div>
      </div>

      {/* Optional Controls Guide Popover (Top-Right under button, never blocks center) */}
      {showHelp && (
        <div
          className="pointer-events-auto self-end mt-2 w-80 rounded-lg border border-white/12 p-4 text-xs text-slate-200 shadow-xl"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
            <span className="font-semibold text-white">Клавиши управления</span>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              Закрыть
            </button>
          </div>
          <div className="space-y-1.5 font-mono-num">
            <div className="flex justify-between">
              <span className="text-slate-400">Езда и руль</span>
              <span className="text-white">W A S D / Стрелки</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Поднять / опустить вилы</span>
              <span className="text-white">E / Q (Space / Shift)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Положить груз вручную</span>
              <span className="text-white">F</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Сменить камеру</span>
              <span className="text-white">C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Фары / Сигнал</span>
              <span className="text-white">L / H</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Вернуться ко въезду</span>
              <span className="text-white">R</span>
            </div>
          </div>
        </div>
      )}

      {/* Middle-Right Toast Notification (transient, non-blocking) */}
      {toastMessage && (
        <div className="pointer-events-none fixed right-5 bottom-28 z-20">
          <div
            className="rounded-lg border border-amber-400/35 px-3.5 py-2 text-xs font-medium text-amber-200 shadow-lg"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
          >
            {toastMessage}
          </div>
        </div>
      )}

      {/* Optional On-Screen Driving Pad for Mouse/Touch */}
      {showTouchPad && (
        <div className="pointer-events-auto fixed left-5 bottom-24 z-20 grid grid-cols-3 gap-1.5 w-36">
          <div />
          <button
            type="button"
            {...holdProps('forward')}
            className="h-11 rounded-md border border-white/15 bg-slate-900/90 text-xs font-semibold text-white active:bg-amber-500 active:text-slate-950 cursor-pointer"
          >
            W
          </button>
          <div />
          <button
            type="button"
            {...holdProps('left')}
            className="h-11 rounded-md border border-white/15 bg-slate-900/90 text-xs font-semibold text-white active:bg-amber-500 active:text-slate-950 cursor-pointer"
          >
            A
          </button>
          <button
            type="button"
            {...holdProps('backward')}
            className="h-11 rounded-md border border-white/15 bg-slate-900/90 text-xs font-semibold text-white active:bg-amber-500 active:text-slate-950 cursor-pointer"
          >
            S
          </button>
          <button
            type="button"
            {...holdProps('right')}
            className="h-11 rounded-md border border-white/15 bg-slate-900/90 text-xs font-semibold text-white active:bg-amber-500 active:text-slate-950 cursor-pointer"
          >
            D
          </button>
        </div>
      )}

      {/* Bottom Collapsible Control Dock */}
      <div className="mt-auto flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((c) => !c)}
          className="pointer-events-auto mb-1.5 flex items-center gap-1.5 rounded-t-md border border-b-0 border-white/12 px-3 py-1 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)' }}
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              <span>Показать панель</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              <span>Скрыть панель</span>
            </>
          )}
        </button>

        <div
          className={`pointer-events-auto w-full max-w-[min(940px,95vw)] rounded-xl border border-white/12 px-3 py-2 shadow-2xl transition-transform duration-200 ${
            dockCollapsed ? 'translate-y-[140%] pointer-events-none opacity-0' : 'translate-y-0 opacity-100'
          }`}
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.90)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Camera Mode Selector */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-950/70 p-1 border border-white/8">
              <Camera className="mx-1.5 h-3.5 w-3.5 text-slate-400 shrink-0" />
              {CAMERA_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onCameraChange(m.id)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    telemetry.cameraMode === m.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Fork Mast Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                {...holdProps('forkUp')}
                className="flex items-center gap-1 rounded-lg border border-white/12 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 whitespace-nowrap cursor-pointer"
              >
                <ArrowUp className="h-3.5 w-3.5" />
                <span>Вилы вверх (E)</span>
              </button>
              <button
                type="button"
                {...holdProps('forkDown')}
                className="flex items-center gap-1 rounded-lg border border-white/12 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 whitespace-nowrap cursor-pointer"
              >
                <ArrowDown className="h-3.5 w-3.5" />
                <span>Вниз (Q)</span>
              </button>
              {telemetry.carryingTitle && (
                <button
                  type="button"
                  onClick={onDropCargo}
                  className="rounded-lg border border-amber-400/40 bg-amber-500/20 px-2.5 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/30 whitespace-nowrap cursor-pointer"
                >
                  Положить (F)
                </button>
              )}
            </div>

            {/* Lights, Horn, Audio, Reset */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleHeadlights}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  telemetry.headlightsOn
                    ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                    : 'border-white/12 bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
                title="Фары (L)"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                <span>Фары</span>
              </button>

              <button
                type="button"
                onClick={onHorn}
                className="rounded-lg border border-white/12 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap cursor-pointer"
                title="Звуковой сигнал (H)"
              >
                Сигнал
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                className="rounded-lg border border-white/12 bg-slate-800/80 p-1.5 text-slate-200 hover:bg-slate-700 cursor-pointer"
                title={muted ? 'Включить звук' : 'Выключить звук'}
              >
                {muted ? <VolumeX className="h-4 w-4 text-slate-400" /> : <Volume2 className="h-4 w-4 text-amber-400" />}
              </button>

              <button
                type="button"
                onClick={onResetPosition}
                className="rounded-lg border border-white/12 bg-slate-800/80 p-1.5 text-slate-200 hover:bg-slate-700 cursor-pointer"
                title="Вернуть погрузчик ко въезду (R)"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
