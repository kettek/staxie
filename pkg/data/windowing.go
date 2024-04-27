package data

type Windowing struct {
	Width      *int
	Height     *int
	Fullscreen *bool
	Maximized  *bool
	Minimized  *bool
}

func WindowingFromAny(m any) Windowing {
	if m, ok := m.(map[string]any); ok {
		fwidth, _ := m["Width"].(float64)
		fheight, _ := m["Height"].(float64)
		width := int(fwidth)
		height := int(fheight)
		fullscreen, _ := m["Fullscreen"].(bool)
		maximized, _ := m["Maximized"].(bool)
		minimized, _ := m["Minimized"].(bool)
		return Windowing{
			Width:      &width,
			Height:     &height,
			Fullscreen: &fullscreen,
			Maximized:  &maximized,
			Minimized:  &minimized,
		}
	}
	return DefaultWindowing
}

var DefaultWindowing Windowing

func init() {
	width := 1280
	height := 720
	fullscreen := false
	maximized := false
	minimized := false
	DefaultWindowing = Windowing{
		Width:      &width,
		Height:     &height,
		Fullscreen: &fullscreen,
		Maximized:  &maximized,
		Minimized:  &minimized,
	}
}
