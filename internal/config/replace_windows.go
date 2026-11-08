//go:build windows

package config

import (
	"errors"
	"os"
)

// Windows does not allow Rename to replace an existing file. Removing the
// previous config first keeps repeated saves working on Windows hosts.
func replaceFile(source, destination string) error {
	if err := os.Remove(destination); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return os.Rename(source, destination)
}
