import type { FieldError, FieldPath, FieldValues, UseFormRegister } from 'react-hook-form';
import { AlertCircle, Info } from 'lucide-react';

function normalizarNumero(valor: unknown): number | undefined {
  if (valor === '' || valor === null || valor === undefined) return undefined;
  if (typeof valor === 'number') return Number.isNaN(valor) ? undefined : valor;
  if (typeof valor === 'string') {
    const n = Number(valor.replace(',', '.').trim());
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

interface CampoNumericoProps<T extends FieldValues> {
  label: string;
  name: FieldPath<T>;
  register: UseFormRegister<T>;
  error?: FieldError;
  dica?: string;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
}

export function CampoNumerico<T extends FieldValues>({
  label,
  name,
  register,
  error,
  dica,
  min,
  max,
  step = '0.1',
  placeholder,
}: CampoNumericoProps<T>) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-xs font-semibold text-stone-600">
        {label}
        {dica ? (
          <span className="group relative cursor-help">
            <Info size={12} className="text-stone-400" />
            <span className="absolute bottom-full left-0 z-50 mb-1 hidden w-56 rounded-lg bg-stone-800 p-2 text-xs text-stone-200 group-hover:block">
              {dica}
            </span>
          </span>
        ) : null}
      </label>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
        {...register(name, { setValueAs: normalizarNumero })}
        className={`w-full rounded-xl border bg-stone-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10 ${
          error
            ? 'border-red-400 bg-red-50/50 focus:border-red-500 focus:ring-red-500/10'
            : 'border-stone-200'
        }`}
      />
      {error ? (
        <span className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle size={11} /> {error.message}
        </span>
      ) : null}
    </div>
  );
}

interface SelectPadraoProps<T extends FieldValues> {
  label: string;
  name: FieldPath<T>;
  register: UseFormRegister<T>;
  options: { value: string; label: string }[];
  error?: FieldError;
  placeholder?: string;
}

export function SelectPadrao<T extends FieldValues>({
  label,
  name,
  register,
  options,
  error,
  placeholder,
}: SelectPadraoProps<T>) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-stone-600">{label}</label>
      <select
        className={`w-full rounded-xl border bg-stone-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10 ${
          error
            ? 'border-red-400 bg-red-50/50 focus:border-red-500 focus:ring-red-500/10'
            : 'border-stone-200'
        }`}
        {...register(name)}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs font-medium text-red-500">{error.message}</span> : null}
    </div>
  );
}
