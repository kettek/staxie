package data

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

// SettingsStore represents a JSON object that can be used to store settings.
type SettingsStore map[string]any

// Merge merges the provided default settings against the current settings, recursively.
func (s *SettingsStore) Merge(def SettingsStore) {
	for k, v := range def {
		if _, ok := (*s)[k]; !ok {
			(*s)[k] = v
		} else if _, ok := v.(map[string]any); ok {
			(*s).Merge(v.(map[string]any))
		}
	}
}

// AppDirectory is os.UserConfigDir() + "/staxie"
var AppDirectory string

// CacheDirectory is os.UserCacheDir() + "/staxie"
var CacheDirectory string

// Settings is our settings "singleton".
var Settings SettingsStore

func init() {
	Settings = make(SettingsStore)
	AppDirectory, _ = os.UserConfigDir()
	AppDirectory = filepath.Join(AppDirectory, "staxie")
	CacheDirectory, _ = os.UserCacheDir()
	CacheDirectory = filepath.Join(CacheDirectory, "staxie")

	// Create app dir
	if _, err := os.Stat(AppDirectory); os.IsNotExist(err) {
		if err = os.MkdirAll(AppDirectory, 0755); err != nil {
			fmt.Println(err)
		}
	}
}

// LoadSettings loads the settings from the settings file.
func LoadSettings(def SettingsStore) error {
	file := filepath.Join(AppDirectory, "settings.json")
	if _, err := os.Stat(file); os.IsNotExist(err) {
		for k, v := range def {
			Settings[k] = v
		}
		return SaveSettings()
	}
	jsonFile, err := os.Open(file)
	if err != nil {
		for k, v := range def {
			Settings[k] = v
		}
		err = errors.Join(err, SaveSettings())
		return err
	}
	defer jsonFile.Close()
	jsonParser := json.NewDecoder(jsonFile)
	if err = jsonParser.Decode(&Settings); err != nil {
		for k, v := range def {
			Settings[k] = v
		}
		err = errors.Join(err, SaveSettings())
		return err
	}
	// Merge the default settings with the loaded settings.
	Settings.Merge(def)
	return nil
}

// SaveSettings saves the settings to the settings file.
func SaveSettings() error {
	// Create the directory if it doesn't exist.
	if _, err := os.Stat(AppDirectory); os.IsNotExist(err) {
		if err = os.MkdirAll(AppDirectory, 0755); err != nil {
			return err
		}
	}

	// Write the file.
	file := filepath.Join(AppDirectory, "settings.json")
	jsonFile, err := os.Create(file)
	if err != nil {
		return err
	}
	defer jsonFile.Close()
	jsonWriter := json.NewEncoder(jsonFile)
	if err = jsonWriter.Encode(Settings); err != nil {
		return err
	}
	return nil
}
