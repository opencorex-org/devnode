//go:build windows

package ssh

// Windows OpenSSH does not support Unix-domain ControlPath sockets. Keepalive
// options still apply, but connection multiplexing must remain disabled.
func platformArgs() []string { return nil }
