import { useState, useCallback } from "react";
import { messageOf } from "../lib/utils";

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string;
};

export function useAsync<T>(asyncFn: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: "",
  });

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const data = await asyncFn();
      setState({ data, loading: false, error: "" });
      return data;
    } catch (reason) {
      const error = messageOf(reason);
      setState((prev) => ({ ...prev, loading: false, error }));
      throw reason;
    }
  }, [asyncFn]);

  return { ...state, execute };
}
