export function PanelTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-white">
        {title}
      </h2>

      {subtitle && (
        <p className="mt-1 text-sm text-slate-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}
