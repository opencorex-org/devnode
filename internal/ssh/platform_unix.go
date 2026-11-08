//go:build !windows

package ssh

func platformArgs() []string {
	return []string{
		"-o", "ControlMaster=auto",
		"-o", "ControlPath=/tmp/devnode-cm-%C",
		"-o", "ControlPersist=60s",
	}
}
