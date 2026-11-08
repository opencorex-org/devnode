export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-300">
        {label}
      </span>

      <input
        type={type}
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="
          w-full rounded-xl
          border border-border
          bg-background px-4 py-3
          text-sm text-white
          placeholder:text-slate-600
          focus:border-indigo-500
          focus:ring-2 focus:ring-indigo-500/10
        "
      />
    </label>
  );
}
