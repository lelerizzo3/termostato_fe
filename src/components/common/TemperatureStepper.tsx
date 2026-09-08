import { useId } from 'react';

const STEP = 0.1;
const DEFAULT_MIN = 5;
const DEFAULT_MAX = 35;

function roundToStep(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export interface TemperatureStepperProps {
  /** Valore corrente in °C. Può essere null quando l'input è vuoto/disabilitato. */
  value: number | null;
  /** Notifica il nuovo valore arrotondato a 0.1 e limitato tra min e max. */
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  /** Etichetta accessibile del gruppo (es. "Temperatura target lunedì 1"). */
  ariaLabel: string;
  /** Valore usato quando value è null e si preme una freccia. */
  fallbackValue?: number;
}

/**
 * Selettore di temperatura mobile-first: campo numerico centrale con due frecce
 * per aumentare/diminuire di 0.1 °C alla volta. Riutilizza le classi utility
 * globali (field-input, btn-secondary) per coerenza visiva.
 */
export function TemperatureStepper({
  value,
  onChange,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  disabled = false,
  ariaLabel,
  fallbackValue = 20
}: TemperatureStepperProps) {
  const inputId = useId();
  const current = value ?? fallbackValue;

  function commit(next: number) {
    onChange(clamp(roundToStep(next), min, max));
  }

  function handleStep(direction: 1 | -1) {
    commit(current + direction * STEP);
  }

  function handleInput(raw: string) {
    if (raw === '') return;
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    commit(parsed);
  }

  const canDecrement = !disabled && current > min;
  const canIncrement = !disabled && current < max;

  return (
    <div className="flex items-stretch gap-1.5" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className="btn-secondary min-h-11 w-11 shrink-0 px-0 text-2xl leading-none"
        onClick={() => handleStep(-1)}
        disabled={!canDecrement}
        aria-label="Diminuisci temperatura di 0,1 °C"
      >
        −
      </button>
      <input
        id={inputId}
        className="field-input px-2 text-center text-sm"
        type="number"
        inputMode="decimal"
        step={STEP}
        min={min}
        max={max}
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => handleInput(event.target.value)}
        aria-label={ariaLabel}
      />
      <button
        type="button"
        className="btn-secondary min-h-11 w-11 shrink-0 px-0 text-2xl leading-none"
        onClick={() => handleStep(1)}
        disabled={!canIncrement}
        aria-label="Aumenta temperatura di 0,1 °C"
      >
        +
      </button>
    </div>
  );
}
