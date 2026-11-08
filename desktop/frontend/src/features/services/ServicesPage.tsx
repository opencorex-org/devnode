import { ServiceCard } from "./components/ServiceCard";
import { useServices } from "./hooks/useServices";
import type { Dashboard, CatalogItem } from "../../types";

export function ServicesPage({
  dashboard,
  catalog,
  refresh,
  notify,
  fail,
}: {
  dashboard: Dashboard | null;
  catalog: CatalogItem[];
  refresh: () => Promise<void>;
  notify: (value: string) => void;
  fail: (value: string) => void;
}) {
  const states = dashboard?.snapshot.Services ?? {};
  const { working, manage } = useServices(refresh, notify, fail);

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {catalog.map((item) => (
        <ServiceCard
          key={item.name}
          item={item}
          state={states[item.name]}
          working={working}
          onManage={manage}
        />
      ))}
    </div>
  );
}
