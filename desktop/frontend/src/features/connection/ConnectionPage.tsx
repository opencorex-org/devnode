import { PairingWizard } from "./components/PairingWizard";
import { ConnectionForm } from "./components/ConnectionForm";
import { Requirements } from "./components/Requirements";
import { useConnection } from "./hooks/useConnection";
import type { Bootstrap } from "../../types";

export function ConnectionPage({
  boot,
  changed,
  notify,
  fail,
}: {
  boot: Bootstrap;
  changed: () => Promise<void>;
  notify: (value: string) => void;
  fail: (value: string) => void;
}) {
  const { form, field, working, missing, save, discover, test } =
    useConnection(boot, changed, notify, fail);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <PairingWizard
          changed={changed}
          notify={notify}
          fail={fail}
        />

        <ConnectionForm
          form={form}
          field={field}
          working={working}
          configured={boot.configured}
          configPath={boot.configPath}
          onSave={(event) => void save(event)}
          onDiscover={() => void discover()}
          onTest={() => void test()}
        />
      </div>

      <Requirements
        tools={boot.tools}
        missing={missing}
        platform={boot.platform}
      />
    </div>
  );
}
