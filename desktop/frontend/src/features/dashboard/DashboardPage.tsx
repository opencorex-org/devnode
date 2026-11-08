import { Cpu, HardDrive, MemoryStick } from "lucide-react";
import { EmptyState } from "../../components/ui/EmptyState";
import { ServerOverview } from "./components/ServerOverview";
import { ResourceMetric } from "./components/ResourceMetric";
import { DevelopmentTools } from "./components/DevelopmentTools";
import { ActiveServices } from "./components/ActiveServices";
import type { Dashboard } from "../../types";

export function DashboardPage({
  dashboard,
  onConfigure,
}: {
  dashboard: Dashboard | null;
  onConfigure: () => void;
}) {
  if (!dashboard) {
    return (
      <EmptyState
        title="Connect your development server"
        description="Configure or discover an Ubuntu host to monitor resources, manage services, and access your development workspace."
        action="Configure connection"
        onAction={onConfigure}
      />
    );
  }

  const snapshot = dashboard.snapshot;

  const services = Object.entries(snapshot.Services ?? {})
    .filter(([, state]) => state.State !== "not-installed")
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <ServerOverview snapshot={snapshot} target={dashboard.target} />

      <div className="grid gap-5 md:grid-cols-3">
        <ResourceMetric
          label="CPU Usage"
          value={snapshot.CPU}
          detail={snapshot.CPUModel}
          icon={<Cpu size={20} />}
        />

        <ResourceMetric
          label="Memory Usage"
          value={snapshot.Memory}
          detail={snapshot.MemoryTotal}
          icon={<MemoryStick size={20} />}
        />

        <ResourceMetric
          label="Disk Usage"
          value={snapshot.Disk}
          detail={snapshot.DiskTotal}
          icon={<HardDrive size={20} />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DevelopmentTools tools={dashboard.tools} />
        <ActiveServices services={services} />
      </div>
    </div>
  );
}
