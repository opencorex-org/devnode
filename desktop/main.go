package main

import (
	_ "embed"
	"embed"
	"log"

	"github.com/lahiruudayakumara/devnode/desktop/backend"
	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var appIcon []byte

func main() {
	app := application.New(application.Options{
		Name: "DevNode",
		Icon: appIcon,
		Services: []application.Service{
			application.NewService(backend.New()),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Linux: application.LinuxOptions{
			ProgramName:   "devnode-desktop",
			ApplicationID: "com.lahiruudayakumara.devnode",
		},
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Name:             "main",
		Title:            "DevNode",
		Width:            1360,
		Height:           860,
		MinWidth:         980,
		MinHeight:        680,
		StartState:       application.WindowStateNormal,
		BackgroundColour: application.NewRGB(9, 14, 24),
		Linux: application.LinuxWindow{
			Icon: appIcon,
		},
	})

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
