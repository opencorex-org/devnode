import logo from "../../assets/logo.png";

export function Brand() {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-border px-3">
      {/* Logo */}
      <img
        src={logo}
        alt="DevNode"
        className="h-8 w-8 shrink-0 rounded-lg object-contain"
      />

      {/* Brand Information */}
      <div className="min-w-0 flex-1">
        <h2 className="truncate bg-linear-to-r from-cyan-400 to-violet-500 bg-clip-text text-sm font-bold leading-4 tracking-tight text-transparent">
          DevNode
        </h2>

        <p className="mt-0.5 truncate text-[9px] leading-3 text-slate-500">
          Remote Workspace
        </p>
      </div>
    </div>
  );
}