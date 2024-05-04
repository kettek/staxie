package data

type StaxieFileV1 struct {
	Version string           `json:"version"` // The version of the file format.
	Groups  map[string]Group `json:"groups"`
	Width   int              `json:"width"`
	Height  int              `json:"height"`
}

type Group struct {
	Animations map[string]Animation `json:"animations"`
}

type Animation struct {
	Frames []Frame `json:"frames"` // The frames of the animation.
	Time   int     `json:"time"`   // time units defined by the editor/game. This could be milliseconds, frames, etc.
}

type Frame struct {
	Slices []Slice `json:"slices"`
}

type Slice struct {
	X                 int     `json:"x"`
	Y                 int     `json:"y"`
	ShadingMultiplier float64 `json:"shadingMultiplier"` // 0.0 multiplies shading by 0, 1.0 allows full normal shading.
}
