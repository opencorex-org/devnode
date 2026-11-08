package ssh

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strconv"
	"strings"

	"github.com/lahiruudayakumara/devnode/internal/config"
)

type Client struct {
	Config config.Config
	In     io.Reader
	Out    io.Writer
	Err    io.Writer
}

func (c Client) Run(ctx context.Context, command []string, tty, batch bool) error {
	args := c.baseArgs(batch)
	if tty {
		args = append(args, "-t")
	}
	args = append(args, config.Target(c.Config))
	if len(command) > 0 {
		args = append(args, JoinCommand(command))
	}
	cmd := exec.CommandContext(ctx, "ssh", args...)
	cmd.Stdin, cmd.Stdout, cmd.Stderr = c.In, c.Out, c.Err
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ssh: %w", err)
	}
	return nil
}

func (c Client) Output(ctx context.Context, script string) ([]byte, error) {
	args := append(c.baseArgs(false), config.Target(c.Config), script)
	cmd := exec.CommandContext(ctx, "ssh", args...)
	cmd.Stdin, cmd.Stderr = c.In, c.Err
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("ssh: %w", err)
	}
	return out, nil
}

// OutputBatch runs a read-only SSH query without allowing SSH to prompt on the
// terminal. This is intended for background jobs such as the live dashboard,
// where SSH and the TUI must never compete for stdin or write directly to the
// screen.
func (c Client) OutputBatch(ctx context.Context, script string) ([]byte, error) {
	args := append(c.baseArgs(true), "-o", "StrictHostKeyChecking=yes", config.Target(c.Config), script)
	cmd := exec.CommandContext(ctx, "ssh", args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	out, err := cmd.Output()
	if err != nil {
		detail := strings.TrimSpace(stderr.String())
		if detail != "" {
			return nil, fmt.Errorf("ssh: %w: %s", err, detail)
		}
		return nil, fmt.Errorf("ssh: %w", err)
	}
	return out, nil
}

// HostCheckCommand returns an interactive, no-op SSH command. Bubble Tea runs
// this while its TUI is suspended so OpenSSH can safely own the terminal while
// the user reviews and accepts a new host key.
func (c Client) HostCheckCommand(ctx context.Context) *exec.Cmd {
	args := append(c.baseArgs(false), config.Target(c.Config), "true")
	return exec.CommandContext(ctx, "ssh", args...)
}

func IsHostVerificationError(err error) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "host key verification failed") ||
		strings.Contains(message, "no ed25519 host key is known") ||
		strings.Contains(message, "no ecdsa host key is known") ||
		strings.Contains(message, "no rsa host key is known")
}

func (c Client) Forward(ctx context.Context, localPort, remotePort int) error {
	forward := fmt.Sprintf("127.0.0.1:%d:127.0.0.1:%d", localPort, remotePort)
	args := append(c.baseArgs(false), "-N", "-L", forward, config.Target(c.Config))
	cmd := exec.CommandContext(ctx, "ssh", args...)
	cmd.Stdin, cmd.Stdout, cmd.Stderr = c.In, c.Out, c.Err
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ssh tunnel: %w", err)
	}
	return nil
}

func (c Client) baseArgs(batch bool) []string {
	args := []string{
		"-o", "ConnectTimeout=" + strconv.Itoa(c.Config.ConnectTimeout),
		"-p", strconv.Itoa(c.Config.Port),
		"-o", "ControlMaster=auto",
		"-o", "ControlPath=/tmp/devnode-cm-%C",
		"-o", "ControlPersist=60s",
		"-o", "ServerAliveInterval=30",
		"-o", "ServerAliveCountMax=3",
		"-o", "TCPKeepAlive=yes",
	}
	if batch {
		args = append(args, "-o", "BatchMode=yes")
	}
	if c.Config.IdentityFile != "" {
		args = append(args, "-i", c.Config.IdentityFile)
	}
	return args
}

// JoinCommand quotes every argument for the remote POSIX shell used by ssh.
func JoinCommand(args []string) string {
	q := make([]string, len(args))
	for i, arg := range args {
		q[i] = "'" + strings.ReplaceAll(arg, "'", `'"'"'`) + "'"
	}
	return strings.Join(q, " ")
}

func IsTerminal(w io.Writer) bool {
	f, ok := w.(*os.File)
	if !ok {
		return false
	}
	info, err := f.Stat()
	return err == nil && info.Mode()&os.ModeCharDevice != 0
}
