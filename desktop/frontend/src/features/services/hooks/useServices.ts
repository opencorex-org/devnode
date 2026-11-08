import { useState } from "react";
import { api } from "../../../services/api";
import { messageOf } from "../../../lib/utils";

export function useServices(
  refresh: () => Promise<void>,
  notify: (value: string) => void,
  fail: (value: string) => void,
) {
  const [working, setWorking] = useState("");

  async function manage(name: string, action: string) {
    setWorking(`${name}:${action}`);
    fail("");

    try {
      notify(String(await api.manageService(name, action)));
      await refresh();
    } catch (reason) {
      fail(messageOf(reason));
    } finally {
      setWorking("");
    }
  }

  return { working, manage };
}
