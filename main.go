package main

import (
	"embed"
	"fmt"

	"github.com/kettek/staxie/pkg/data"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Load settings.
	if err := data.LoadSettings(data.SettingsStore{
		"Windowing": data.DefaultWindowing,
	}); err != nil {
		fmt.Println("Error loading settings:", err)
	}
	windowSettings := data.WindowingFromAny(data.Settings["Windowing"])

	windowStartState := options.Normal
	if *windowSettings.Maximized {
		windowStartState = options.Maximised
	} else if *windowSettings.Minimized {
		windowStartState = options.Minimised
	} else if *windowSettings.Fullscreen {
		windowStartState = options.Fullscreen
	}

	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "Staxie",
		Width:  *windowSettings.Width,
		Height: *windowSettings.Height,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		WindowStartState: windowStartState,
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
