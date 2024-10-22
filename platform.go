package main

import "runtime"

type Platform struct{}

func (p *Platform) getArch() string {
	return runtime.GOARCH
}

func (p *Platform) getOS() string {
	return runtime.GOOS
}

func (p *Platform) GetPlatform() string {
	return p.getOS() + "-" + p.getArch()
}
