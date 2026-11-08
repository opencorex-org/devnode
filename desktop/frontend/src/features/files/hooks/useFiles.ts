import { useState } from "react";

export function useFiles() {
  const [currentPath, setCurrentPath] = useState("~/projects");
  const [files, setFiles] = useState<string[]>([]);

  return {
    currentPath,
    setCurrentPath,
    files,
    setFiles,
  };
}
