package main

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"sync"

	"github.com/kettek/staxie/pkg/data"

	"runtime/debug"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx           context.Context
	versionString string
	fsAccess      sync.Mutex
	RichPresence
}

// NewApp creates a new App application struct
func NewApp() *App {
	a := &App{
		versionString: "unknown",
	}
	if bld, ok := debug.ReadBuildInfo(); ok {
		version := bld.Main.Version
		for _, kv := range bld.Settings {
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

func (a *App) GetOSSeparator() string {
	return string(filepath.Separator)
}

func (a *App) AppDirectory(p string) string {
	return filepath.Join(data.AppDirectory, p)
}

func (a *App) CacheDirectory(p string) string {
	return filepath.Join(data.CacheDirectory, p)
}

func (a *App) ReadBytes(name string) ([]byte, error) {
	return os.ReadFile(name)
}

func (a *App) GetFilesInDir(dir string) ([]string, error) {
	files, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var names []string
	for _, f := range files {
		names = append(names, f.Name())
	}
	return names, nil
}

func (a *App) GetFilePath(names []string, patterns []string) (string, error) {
	a.fsAccess.Lock()
	defer a.fsAccess.Unlock()
	var f []runtime.FileFilter
	for i, n := range names {
		ff := runtime.FileFilter{
			DisplayName: n,
		}
		if i < len(patterns) {
			ff.Pattern = patterns[i]
		}
		f = append(f, ff)
	}
	file, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Filters: f,
	})
	if err != nil {
		return "", err
	}
	return file, nil
}

func (a *App) GetFileSavePath(names []string, patterns []string) (string, error) {
	a.fsAccess.Lock()
	defer a.fsAccess.Unlock()
	var f []runtime.FileFilter
	for i, n := range names {
		ff := runtime.FileFilter{
			DisplayName: n,
		}
		if i < len(patterns) {
			ff.Pattern = patterns[i]
		}
		f = append(f, ff)
	}
	file, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Filters: f,
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
	a.fsAccess.Lock()
	defer a.fsAccess.Unlock()
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

func (a *App) onResize(v ...interface{}) {
	w, h := runtime.WindowGetSize(a.ctx)
	isFullscreen := runtime.WindowIsFullscreen(a.ctx)
	isMaximized := runtime.WindowIsMaximised(a.ctx)
	isMinimized := runtime.WindowIsMinimised(a.ctx)

	settings := data.WindowingFromAny(data.Settings["Windowing"])

	settings.Fullscreen = &isFullscreen
	settings.Maximized = &isMaximized
	settings.Minimized = &isMinimized
	if !isFullscreen && !isMaximized && !isMinimized {
		settings.Width = &w
		settings.Height = &h
	}
	data.Settings["Windowing"] = settings
	if err := data.SaveSettings(); err != nil {
		log.Println("Error saving settings:", err)
	}
}

// Version returns the version string. This is set at compile time.
func (a *App) Version() string {
	return a.versionString
}

// SetSetting sets a setting in the settings store.
func (a *App) SetSetting(key string, value string) {
	data.Settings[key] = value
	data.SaveSettings()
}

// ClearSetting clears a setting in the settings store.
func (a *App) ClearSetting(key string) {
	delete(data.Settings, key)
	data.SaveSettings()
}

// GetSetting gets a setting from the settings store.
func (a *App) GetSetting(key string) any {
	return data.Settings[key]
}

// ToggleFullscreen toggles the fullscreen state of the window.
func (a *App) ToggleFullscreen() {
	// NOTE: we lazily call onResize here to update the underlying settings.
	if runtime.WindowIsFullscreen(a.ctx) {
		runtime.WindowUnfullscreen(a.ctx)
		a.onResize(nil)
		return
	}
	runtime.WindowFullscreen(a.ctx)
	a.onResize(nil)
}
