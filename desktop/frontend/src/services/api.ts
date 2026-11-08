import * as Backend from "../../bindings/github.com/lahiruudayakumara/devnode/desktop/backend/service";
import type { Bootstrap, CatalogItem, ConnectionInput, Dashboard, PairingServer, PairProgress, Project } from "../types";

export const api = {
  bootstrap: () => Backend.Bootstrap() as Promise<Bootstrap>,
  saveConnection: (input: ConnectionInput) => Backend.SaveConnection(input),
  discoverPairingServers: () => Backend.DiscoverPairingServers() as Promise<PairingServer[]>,
  requestPair: (server: PairingServer) => Backend.RequestPair(server) as Promise<PairProgress>,
  pairStatus: (requestId: string) => Backend.PairStatus(requestId) as Promise<PairProgress>,
  discover: () => Backend.Discover(),
  testConnection: () => Backend.TestConnection(),
  dashboard: () => Backend.Dashboard() as Promise<Dashboard>,
  catalog: () => Backend.Catalog() as Promise<CatalogItem[]>,
  manageService: (name: string, action: string) => Backend.ManageService(name, action),
  projects: () => Backend.Projects() as Promise<Project[]>,
  createProject: (name: string) => Backend.CreateProject(name),
  deleteProject: (name: string) => Backend.DeleteProject(name),
  connectionCommand: () => Backend.ConnectionCommand() as Promise<string>,
};
