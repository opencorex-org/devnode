import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "./AppLayout";
import { navigation } from "./navigation";
import { Loading } from "../components/ui/Loading";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { ProjectsPage } from "../features/projects/ProjectsPage";
import { ServicesPage } from "../features/services/ServicesPage";
import { TerminalPage } from "../features/terminal/TerminalPage";
import { ConnectionPage } from "../features/connection/ConnectionPage";
import { HelpPage } from "../features/help/HelpPage";
import { api } from "../services/api";
import { messageOf } from "../lib/utils";
import { formatTime } from "../lib/formatters";
import type {
  Bootstrap,
  CatalogItem,
  Dashboard,
  Page,
  Project,
} from "../types";

export default function App() {
  const [page, setPage] = useState<Page>("overview");
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      setProjects(await api.projects());
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setBusy(true);
    setError("");

    try {
      setDashboard(await api.dashboard());
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }, []);

  const initialise = useCallback(async () => {
    setBusy(true);
    setError("");

    try {
      const next = await api.bootstrap();
      setBoot(next);
      setCatalog(await api.catalog());

      if (
        next.configured &&
        !["auto", "", "192.168.x.x"].includes(next.config.Host)
      ) {
        try {
          setDashboard(await api.dashboard());
        } catch (reason) {
          setError(messageOf(reason));
        }
      } else {
        setDashboard(null);
        setPage("settings");
      }
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void initialise();
  }, [initialise]);

  useEffect(() => {
    if (page === "projects") {
      void loadProjects();
    }
  }, [page, loadProjects]);

  const handleRefresh = useCallback(async () => {
    if (page === "projects") {
      await loadProjects();
    } else {
      await loadDashboard();
    }
  }, [page, loadProjects, loadDashboard]);

  const online = Boolean(dashboard && !error);
  const title =
    navigation.find((item) => item.id === page)?.label ?? "DevNode";

  return (
    <AppLayout
      page={page}
      onNavigate={(p) => {
        setPage(p);
        setError("");
      }}
      title={title}
      updatedAt={dashboard ? formatTime(dashboard.updatedAt) : undefined}
      busy={busy || (page === "projects" && projectsLoading)}
      onRefresh={() => void handleRefresh()}
      online={online}
      target={dashboard?.target}
      host={boot?.config.Host}
      platform={boot?.platform}
      error={error}
      notice={notice}
      onDismissAlert={() => {
        setError("");
        setNotice("");
      }}
    >
      {busy && !boot && <Loading />}

      {page === "overview" && (
        <DashboardPage
          dashboard={dashboard}
          onConfigure={() => setPage("settings")}
        />
      )}

      {page === "projects" && (
        <ProjectsPage
          projects={projects}
          loading={projectsLoading}
          reload={loadProjects}
          notify={setNotice}
          fail={setError}
        />
      )}

      {page === "services" && (
        <ServicesPage
          dashboard={dashboard}
          catalog={catalog}
          refresh={loadDashboard}
          notify={setNotice}
          fail={setError}
        />
      )}

      {page === "terminal" && <TerminalPage />}

      {page === "settings" && boot && (
        <ConnectionPage
          boot={boot}
          changed={async () => {
            await initialise();
            setPage("overview");
          }}
          notify={setNotice}
          fail={setError}
        />
      )}

      {page === "help" && (
        <HelpPage initialPlatform={boot?.platform ?? "darwin"} />
      )}
    </AppLayout>
  );
}
