package pairing

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func DevicesPath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "devnode-agent", "devices.json"), nil
}

func LoadDevices() ([]Device, error) {
	path, err := DevicesPath()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return []Device{}, nil
	}
	if err != nil {
		return nil, err
	}
	var devices []Device
	if err := json.Unmarshal(data, &devices); err != nil {
		return nil, err
	}
	return devices, nil
}

func AddDevice(name, publicKey string) (Device, error) {
	key, err := NormalizePublicKey(publicKey, name)
	if err != nil {
		return Device{}, err
	}
	id, err := Fingerprint(key)
	if err != nil {
		return Device{}, err
	}
	if err := addAuthorizedKey(key); err != nil {
		return Device{}, err
	}
	devices, err := LoadDevices()
	if err != nil {
		return Device{}, err
	}
	device := Device{ID: id, Name: name, PublicKey: key, PairedAt: time.Now().UTC()}
	replaced := false
	for index := range devices {
		if devices[index].ID == id {
			devices[index] = device
			replaced = true
		}
	}
	if !replaced {
		devices = append(devices, device)
	}
	return device, saveDevices(devices)
}

func RevokeDevice(selector string) (Device, error) {
	devices, err := LoadDevices()
	if err != nil {
		return Device{}, err
	}
	var removed Device
	kept := make([]Device, 0, len(devices))
	for _, device := range devices {
		if removed.ID == "" && (device.Name == selector || device.ID == selector || strings.HasPrefix(device.ID, selector)) {
			removed = device
			continue
		}
		kept = append(kept, device)
	}
	if removed.ID == "" {
		return Device{}, fmt.Errorf("paired device %q was not found", selector)
	}
	if err := removeAuthorizedKey(removed.PublicKey); err != nil {
		return Device{}, err
	}
	return removed, saveDevices(kept)
}

func saveDevices(devices []Device) error {
	path, err := DevicesPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(devices, "", "  ")
	if err != nil {
		return err
	}
	data = append(data, '\n')
	return atomicWrite(path, data, 0600)
}

func authorizedKeysPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".ssh", "authorized_keys"), nil
}

func addAuthorizedKey(publicKey string) error {
	path, err := authorizedKeysPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return err
	}
	data, err := os.ReadFile(path)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	wanted, _ := Fingerprint(publicKey)
	scanner := bufio.NewScanner(strings.NewReader(string(data)))
	for scanner.Scan() {
		fingerprint, fingerprintErr := Fingerprint(scanner.Text())
		if fingerprintErr == nil && fingerprint == wanted {
			return nil
		}
	}
	file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)
	if err != nil {
		return err
	}
	defer file.Close()
	if len(data) > 0 && data[len(data)-1] != '\n' {
		if _, err := file.WriteString("\n"); err != nil {
			return err
		}
	}
	_, err = file.WriteString(publicKey + "\n")
	return err
}

func removeAuthorizedKey(publicKey string) error {
	path, err := authorizedKeysPath()
	if err != nil {
		return err
	}
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	wanted, _ := Fingerprint(publicKey)
	var lines []string
	for _, line := range strings.Split(string(data), "\n") {
		fingerprint, fingerprintErr := Fingerprint(line)
		if fingerprintErr == nil && fingerprint == wanted {
			continue
		}
		if line != "" {
			lines = append(lines, line)
		}
	}
	content := []byte(strings.Join(lines, "\n"))
	if len(content) > 0 {
		content = append(content, '\n')
	}
	return atomicWrite(path, content, 0600)
}

func atomicWrite(path string, data []byte, mode os.FileMode) error {
	tmp, err := os.CreateTemp(filepath.Dir(path), ".devnode-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if err := tmp.Chmod(mode); err != nil {
		tmp.Close()
		return err
	}
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, path)
}
