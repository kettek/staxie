package main

import (
	"time"

	"github.com/hugolgst/rich-go/client"
)

type RichPresence struct {
	state   string
	details string
	start   time.Time
}

func (r *RichPresence) StartRichPresence() error {
	err := client.Login("1257854443718836314")
	if err != nil {
		return err
	}
	r.state = "Starting..."
	r.start = time.Now()
	return r.UpdateRichPresence()
}

func (r *RichPresence) StopRichPresence() error {
	client.Logout()
	return nil
}

func (r *RichPresence) SetRichPresenceState(s string) {
	r.state = s
}

func (r *RichPresence) SetRichPresenceDetails(d string) {
	r.details = d
}

func (r *RichPresence) UpdateRichPresence() error {
	err := client.SetActivity(client.Activity{
		State:   r.state,
		Details: r.details,
		Timestamps: &client.Timestamps{
			Start: &r.start,
		},
		LargeImage: "staxie-border",
		LargeText:  "Open Source 2D/3D sprite stack editor",
		Buttons: []*client.Button{
			{
				Label: "GitHub",
				Url:   "https://github.com/kettek/staxie",
			},
		},
	})
	if err != nil {
		return err
	}

	return nil
}
