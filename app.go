package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/kettek/staxie/pkg/data"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx           context.Context
	versionString string
}

// NewApp creates a new App application struct
func NewApp() *App {
	a := &App{
		versionString: "unknown",
	}
	if bld, ok := debug.ReadBuildInfo(); ok {
		version := bld.Main.Version
		for _, kv := range bld.Settings {
			fmt.Println("ugh", kv)
			switch kv.Key {
			case "vcs.revision":
				version = kv.Value
			case "vcs.modified":
				if kv.Value == "true" {
					version += "-dirty"
				}
			}
		}
		a.versionString = version
	}
	return a
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) Load(name string) *data.StaxieFileV1 {
	return &data.StaxieFileV1{}
}

func (a *App) Save(name string, file *data.StaxieFileV1) error {
	b, err := json.Marshal(file)
	if err != nil {
		return err
	}

	fmt.Println("write", string(b))
	if err := os.WriteFile(name, b, 0644); err != nil {
		return err
	}
	return nil
}

func (a *App) ReadBytes(name string) ([]byte, error) {
	return os.ReadFile(name)
}

func (a *App) GetFilePath() (string, error) {
	file, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Filters: []runtime.FileFilter{
			{
				DisplayName: "pee enn gees",
				Pattern:     "*.png",
			},
		},
	})
	if err != nil {
		return "", err
	}
	return file, nil
}

func (a *App) OpenFileBytes(p string) ([]byte, error) {
	b, err := os.ReadFile(p)
	if err != nil {
		return nil, err
	}
	return b, nil
}

func (a *App) SaveFilePath(p string) (string, error) {
	file, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultDirectory: filepath.Dir(p),
		DefaultFilename:  filepath.Base(p),
		Filters: []runtime.FileFilter{
			{
				DisplayName: "pee enn gees",
				Pattern:     "*.png",
			},
		},
	})
	if err != nil {
		return "", err
	}
	return file, nil
}

func (a *App) SaveFileBytes(p string, b []byte) error {
	return os.WriteFile(p, b, 0644)
}

func (a *App) Version() string {
	return a.versionString
}
