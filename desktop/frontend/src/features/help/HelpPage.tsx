import {
  AlertTriangle,
  ArrowRight,
  Cloud,
  Monitor,
  Server,
  ShieldCheck,
  Terminal,
} from "lucide-react";

import { Card } from "../../components/ui/Card";
import { HelpStep } from "./components/HelpStep";
import { PanelTitle } from "../../components/shared/PanelTitle";
import { useState } from "react";
import { APP_VERSION } from "../../version";

type HelpPlatform = "darwin" | "windows" | "linux";

const clientSetup: Record<
  HelpPlatform,
  {
    label: string;
    command: string;
    note: string;
  }
> = {
  darwin: {
    label: "macOS",
    command: "ssh -V",
    note: "OpenSSH is included with macOS. Run this in Terminal to confirm it is available.",
  },

  windows: {
    label: "Windows",
    command:
      "Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Client*'\nAdd-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0",
    note: "Run PowerShell as Administrator if OpenSSH is not installed.",
  },

  linux: {
    label: "Linux",
    command: "sudo apt update\nsudo apt install -y openssh-client",
    note: "These commands are for Debian and Ubuntu clients.",
  },
};

const troubleshooting = [
  {
    title: "Operation timed out",
    text: "Check the IP address, SSH service, firewall, and network connectivity.",
  },
  {
    title: "Connection refused",
    text: "SSH may not be running or listening on the expected port.",
  },
  {
    title: "Permission denied",
    text: "Check the Ubuntu username and authentication configuration.",
  },
  {
    title: "Host key changed",
    text: "Verify the server identity before updating the trusted SSH host key.",
  },
];

export function HelpPage({
  initialPlatform,
  version = APP_VERSION,
}: {
  initialPlatform: string;
  version?: string;
}) {
  const detected: HelpPlatform =
    initialPlatform === "windows"
      ? "windows"
      : initialPlatform === "linux"
        ? "linux"
        : "darwin";

  const [platform, setPlatform] = useState<HelpPlatform>(detected);

  const client = clientSetup[platform];

  const steps = [
    {
      number: "01",
      title: "Prepare the Ubuntu server",
      text: "Install SSH, start it immediately, and enable it after restart.",
      command:
        "sudo apt update\nsudo apt install -y openssh-server\nsudo systemctl enable --now ssh\ncommand -v ufw >/dev/null && sudo ufw allow OpenSSH",
    },
    {
      number: "02",
      title: "Find the Ubuntu address",
      text: "Both computers must be connected to the same local network.",
      command: "hostname -I",
      hint: "Example: 192.168.1.20",
    },
    {
      number: "03",
      title: `Prepare ${client.label}`,
      text: client.note,
      command: client.command,
    },
    {
      number: "04",
      title: "Test SSH manually",
      text: "Replace the username and IP address with your Ubuntu credentials.",
      command: "ssh ubuntu-user@192.168.1.20",
      hint: "Verify the SSH host fingerprint before accepting it.",
    },
    {
      number: "05",
      title: "Install and start the Ubuntu agent",
      text: "Install the DevNode pairing agent and start a secure pairing session.",
      command:
        "git clone https://github.com/opencorex-org/devnode.git\ncd devnode\nmake install-agent\n~/.local/bin/devnode-agent pair",
      hint: "If UFW is active, allow TCP 42424 and UDP 42425.",
    },
    {
      number: "06",
      title: "Pair automatically",
      text: "Open Connection, scan your local network, choose the Ubuntu computer, compare the six-digit code, and approve pairing in the Ubuntu terminal.",
    },
  ];

  return (
    <div className="min-w-0 space-y-3">
      {/* Connection Overview */}
      <Card className="overflow-hidden border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 to-surface p-3">
        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-semibold text-indigo-400">
          <ShieldCheck size={11} />
          DEVNODE v{version} · CONNECTION GUIDE
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Description */}
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold leading-5">
              Connect DevNode to Ubuntu
            </h2>

            <p className="mt-1 max-w-xl text-[10px] leading-4 text-slate-400">
              Connect securely to your Ubuntu development server
              from macOS, Windows, or Linux using SSH.
            </p>
          </div>

          {/* Connection Diagram */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-2">
              <Monitor size={14} className="text-cyan-400" />

              <div>
                <p className="text-[10px] font-semibold">
                  {client.label}
                </p>

                <p className="text-[9px] text-slate-500">
                  Desktop
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[9px] text-indigo-400">
              <span>SSH:22</span>
              <ArrowRight size={12} />
            </div>

            <div className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-2">
              <Server size={14} className="text-indigo-400" />

              <div>
                <p className="text-[10px] font-semibold">
                  Ubuntu
                </p>

                <p className="text-[9px] text-slate-500">
                  Server
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Platform Selection */}
      <div
        role="tablist"
        aria-label="Client operating system"
        className="flex flex-wrap items-center gap-1.5"
      >
        {(["darwin", "windows", "linux"] as HelpPlatform[]).map(
          (item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={platform === item}
              onClick={() => setPlatform(item)}
              className={`
                inline-flex h-7 items-center justify-center
                rounded-md px-3 text-[10px] font-medium
                transition-colors
                ${
                  platform === item
                    ? "bg-indigo-500 text-white"
                    : "border border-border bg-surface text-slate-400 hover:text-white"
                }
              `}
            >
              {clientSetup[item].label}
            </button>
          ),
        )}
      </div>

      {/* Setup Steps Grid */}
      <section className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold">
            Setup steps
          </h3>

          <span className="text-[9px] text-slate-500">
            6 steps
          </span>
        </div>

        <div
          className="
            grid min-w-0 grid-cols-1
            items-stretch gap-2
            md:grid-cols-2
            xl:grid-cols-3
          "
        >
          {steps.map((step) => (
            <HelpStep
              key={step.number}
              number={step.number}
              title={step.title}
              text={step.text}
              command={step.command}
              hint={step.hint}
            />
          ))}
        </div>
      </section>

      <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-surface p-3">
        <div className="mb-3 flex items-start gap-2">
          <Cloud size={15} className="mt-0.5 shrink-0 text-cyan-400" />
          <PanelTitle
            title="Remote access with Cloudflare WARP"
            subtitle="Private SSH and PostgreSQL without router port forwarding"
          />
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["1", "Install the connector", "Create a remotely managed Tunnel, then run the Cloudflare-provided command on Ubuntu: sudo cloudflared service install <TUNNEL_TOKEN>"],
            ["2", "Route one private IP", "Assign 10.77.0.10/32 to Ubuntu loopback and add the same CIDR under the Tunnel private-network routes."],
            ["3", "Authorize devices", "Enroll the desktop in Cloudflare WARP. Require identity, MFA, and an approved device in Zero Trust policies."],
            ["4", "Connect DevNode", "Select Cloudflare WARP under Connection, enter 10.77.0.10, save, and test. Keep router ports 22 and 5432 closed."],
          ].map(([number, title, text]) => (
            <div key={number} className="rounded-md border border-border bg-background/50 p-2.5">
              <span className="text-[9px] font-semibold text-cyan-400">REMOTE {number}</span>
              <h3 className="mt-1 text-[10px] font-semibold">{title}</h3>
              <p className="mt-1 text-[9px] leading-3.5 text-slate-400">{text}</p>
            </div>
          ))}
        </div>

        <p className="mt-2 text-[9px] leading-3.5 text-slate-500">
          PostgreSQL should listen only on localhost and the private overlay address. Use DevNode&apos;s PostgreSQL SSH tunnel for database clients; never publish port 5432 directly.
        </p>
      </Card>

      {/* Troubleshooting */}
      <Card className="p-3">
        <div className="mb-3">
          <PanelTitle
            title="Connection troubleshooting"
            subtitle="Common SSH errors and solutions"
          />
        </div>

        {/* Troubleshooting Grid */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {troubleshooting.map((item) => (
            <div
              key={item.title}
              className="
                flex min-w-0 items-start gap-2
                rounded-md border border-border
                bg-background/50 p-2.5
              "
            >
              <AlertTriangle
                size={12}
                className="mt-0.5 shrink-0 text-amber-400"
              />

              <div className="min-w-0">
                <h3 className="text-[10px] font-semibold leading-4">
                  {item.title}
                </h3>

                <p className="mt-1 text-[9px] leading-3.5 text-slate-400">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Diagnostic Commands */}
        <div className="mt-3 border-t border-border pt-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Terminal size={12} className="text-indigo-400" />

            <h4 className="text-[10px] font-semibold">
              Diagnostic commands
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-3">
            {[
              "ping 192.168.1.20",
              "nc -vz 192.168.1.20 22",
              "ssh -v ubuntu-user@192.168.1.20",
            ].map((command) => (
              <code
                key={command}
                className="
                  min-w-0 overflow-x-auto
                  rounded-md border border-border
                  bg-black/40 px-2.5 py-2
                  font-mono text-[9px] text-cyan-400
                "
              >
                {command}
              </code>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
