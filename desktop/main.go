package main

import (
	"embed"
	"log"

	"github.com/lahiruudayakumara/devnode/desktop/backend"
	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := application.New(application.Options{
		Name: "DevNode",
		Services: []application.Service{
			application.NewService(backend.New()),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
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
	})

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
