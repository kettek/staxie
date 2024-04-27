package main

import (
	"embed"
	"fmt"
	"io"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/kettek/staxie/pkg/data"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Set logging to output to both a file and stdout.
	if err := os.MkdirAll(filepath.Join(data.AppDirectory, "logs"), 0755); err != nil {
		log.Println("Error creating log directory:", err)
	} else {
		// Clear out log files older than 7 days.
		if filepath.WalkDir(filepath.Join(data.AppDirectory, "logs"), func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if d.IsDir() {
				return nil
			}
			info, err := d.Info()
			if err != nil {
				return err
			}
			if time.Since(info.ModTime()) > 7*24*time.Hour {
				if err := os.Remove(path); err != nil {
					log.Println("Error removing log file:", err)
				}
			}
			return nil
		}); err != nil {
			log.Println("Error cleaning up log files:", err)
		}

		writer1 := os.Stdout
		date := time.Now().Unix()
		writer2, err := os.Create(filepath.Join(data.AppDirectory, "logs", fmt.Sprintf("%d.log", date)))
		if err != nil {
			log.Println("Error creating log file:", err)
		} else {
			log.SetOutput(io.MultiWriter(writer1, writer2))
		}
	}

	log.Println("Starting Staxie...")

	// Load settings.
	log.Println("Loading settings...")
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
	log.Println("Running Wails...")
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
		log.Println(err)
	}
}
