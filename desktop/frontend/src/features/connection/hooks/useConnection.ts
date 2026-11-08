import { useState, type FormEvent } from "react";
import { api } from "../../../services/api";
import { messageOf } from "../../../lib/utils";
import type { Bootstrap, ConnectionInput } from "../../../types";

export function useConnection(
  boot: Bootstrap,
  changed: () => Promise<void>,
  notify: (value: string) => void,
  fail: (value: string) => void,
) {
  const [form, setForm] = useState<ConnectionInput>(() => ({
    connectionMode: boot.config.ConnectionMode || "local",
    host: boot.config.Host,
    user: boot.config.User,
    port: boot.config.Port,
    identityFile: boot.config.IdentityFile,
    connectTimeout: boot.config.ConnectTimeout,
    postgresService: boot.config.PostgresService,
  }));

  const [working, setWorking] = useState("");

  const missing = boot.tools.filter((tool) => !tool.available);

  function field<K extends keyof ConnectionInput>(
    key: K,
    value: ConnectionInput[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setWorking("save");
    fail("");

    try {
      const result = await api.saveConnection(form);
      notify(String(result.message ?? "Saved"));
      await changed();
    } catch (reason) {
      fail(messageOf(reason));
    } finally {
      setWorking("");
    }
  }

  async function discover() {
    setWorking("discover");
    fail("");

    try {
      const result = await api.discover();
      notify(String(result.message));
      await changed();
    } catch (reason) {
      fail(messageOf(reason));
    } finally {
      setWorking("");
    }
  }

  async function test() {
    setWorking("test");
    fail("");

    try {
      const result = await api.testConnection();
      notify(`Connected to ${result.target}`);
    } catch (reason) {
      fail(messageOf(reason));
    } finally {
      setWorking("");
    }
  }

  return { form, field, working, missing, save, discover, test };
}
