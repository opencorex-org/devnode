package version

import (
	"regexp"
	"testing"
)

func TestVersionFormat(t *testing.T) {
	semver := regexp.MustCompile(`^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$`)
	if !semver.MatchString(Current) {
		t.Fatalf("version %q does not match semantic versioning format", Current)
	}
}
