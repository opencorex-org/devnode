package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"text/tabwriter"
	"time"

	"github.com/opencorex-org/devnode/internal/pairing"
)

func main() {
	if len(os.Args) < 2 {
		usage()
		return
	}
	var err error
	switch os.Args[1] {
	case "pair":
		err = pair()
	case "devices":
		err = devices()
	case "revoke":
		if len(os.Args) != 3 {
			err = fmt.Errorf("usage: devnode-agent revoke <name|fingerprint>")
		} else {
			var device pairing.Device
			device, err = pairing.RevokeDevice(os.Args[2])
			if err == nil {
				fmt.Printf("Revoked %s (%s)\n", device.Name, device.ID)
			}
		}
	case "help", "--help", "-h":
		usage()
	default:
		err = fmt.Errorf("unknown command %q", os.Args[1])
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "devnode-agent:", err)
		os.Exit(1)
	}
}

func pair() error {
	agent, err := pairing.NewAgent(os.Stdin, os.Stdout, 2*time.Minute)
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	ctx, cancel := context.WithDeadline(ctx, agent.ExpiresAt)
	defer cancel()
	fmt.Printf("DevNode pairing is available for 2 minutes.\nServer: %s\nUbuntu user: %s\nSSH host fingerprint: %s\nWaiting for DevNode Desktop...\n", agent.Name, agent.User, agent.HostFingerprint)
	return agent.Run(ctx)
}

func devices() error {
	items, err := pairing.LoadDevices()
	if err != nil {
		return err
	}
	if len(items) == 0 {
		fmt.Println("No paired devices.")
		return nil
	}
	w := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)
	fmt.Fprintln(w, "NAME\tFINGERPRINT\tPAIRED")
	for _, item := range items {
		fmt.Fprintf(w, "%s\t%s\t%s\n", item.Name, item.ID, item.PairedAt.Local().Format(time.RFC3339))
	}
	return w.Flush()
}

func usage() {
	fmt.Println(`DevNode Ubuntu pairing agent

Usage:
  devnode-agent pair                 Open secure pairing for two minutes
  devnode-agent devices              List approved client devices
  devnode-agent revoke <device>      Remove a device and its SSH key`)
}
