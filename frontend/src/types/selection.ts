export class SelectionArea {
  public marchingCanvas: HTMLCanvasElement
  private marchStep: number = 0
  private offsetX: number = 0
  private offsetY: number = 8
  
  public active: boolean

  private canvas: HTMLCanvasElement
  private pixelMaskCanvas: HTMLCanvasElement
  private pixelMaskCanvasPixels: ImageData
  private redrawPixelMask: boolean

  private checkerboard: HTMLCanvasElement

  constructor(width: number, height: number, zoom: number) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = width * zoom
    this.canvas.height = height * zoom

    this.marchingCanvas = document.createElement('canvas')
    this.marchingCanvas.width = width * zoom
    this.marchingCanvas.height = height * zoom

    this.pixelMaskCanvas = document.createElement('canvas')
    this.pixelMaskCanvas.width = width
    this.pixelMaskCanvas.height = height
    this.pixelMaskCanvasPixels = new ImageData(width, height)

    this.checkerboard = document.createElement('canvas')
    this.checkerboard.width = 64
    this.checkerboard.height = 64
    let ctx = this.checkerboard.getContext('2d')
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, this.checkerboard.width, this.checkerboard.height)
    let rows = this.checkerboard.height / 4
    let cols = this.checkerboard.width / 4
    ctx.beginPath()
    ctx.fillStyle = '#ffffff'
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r % 2 === 0 && c % 2 === 1 || r % 2 === 1 && c % 2 === 0) {
          ctx.rect(
            c * 4,
            r * 4,
            4,
            4,
          )
        }
      }
    }
    ctx.fill()

    this.redrawPixelMask = true
    this.refresh()
  }

  public resize(width: number, height: number, zoom: number) {
    // Copy the old pixel mask pixels to a new one.
    let pixelMaskCanvasPixels = new ImageData(width, height)
    for (let y = 0; y < Math.min(this.pixelMaskCanvas.height, height); y++) {
      for (let x = 0; x < Math.min(this.pixelMaskCanvas.width, width); x++) {
        pixelMaskCanvasPixels.data[(y * width + x) * 4 + 3] = this.pixelMaskCanvasPixels.data[(y * this.pixelMaskCanvas.width + x) * 4 + 3]
      }
    }
    this.pixelMaskCanvasPixels = pixelMaskCanvasPixels

    // Resize canvases and redraw.
    this.marchingCanvas.width = width * zoom
    this.marchingCanvas.height = height * zoom
    this.canvas.width = width * zoom
    this.canvas.height = height * zoom
    this.pixelMaskCanvas.width = width
    this.pixelMaskCanvas.height = height
    this.redrawPixelMask = true

    this.refresh()
  }

  public refresh() {
    if (this.redrawPixelMask) {
      this.pixelMaskCanvas.getContext('2d').putImageData(this.pixelMaskCanvasPixels, 0, 0)

      let ctx = this.canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      ctx.imageSmoothingEnabled = false
      ctx.save()
      ctx.scale(this.canvas.width / this.pixelMaskCanvas.width, this.canvas.height / this.pixelMaskCanvas.height)
      ctx.drawImage(this.pixelMaskCanvas, 0, 0)
      ctx.restore()

      let imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
      let dilatedImageData = ctx.createImageData(this.canvas.width, this.canvas.height)

      let getPixelIndex = (x: number, y: number): number => {
        return (y * this.canvas.width + x) * 4
      }

      // Dilate the pixel mask.
      for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
          let i = getPixelIndex(x, y)
          let a = imageData.data[i + 3]
          if (a === 255) {
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                let xx = x + dx
                let yy = y + dy
                if (xx >= 0 && xx < imageData.width && yy >= 0 && yy < imageData.height) {
                  let ii = getPixelIndex(xx, yy)
                  dilatedImageData.data[ii + 3] = 255
                }
              }
            }
          }
        }
      }

      // Subtract the original pixel mask from the dilated one.
      for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
          let i = getPixelIndex(x, y)
          let a = imageData.data[i + 3]
          if (a === 255) {
            dilatedImageData.data[i + 3] = 0
          }
        }
      }

      // Put the dilated pixel mask back into the canvas.
      ctx.putImageData(dilatedImageData, 0, 0)

      this.redrawPixelMask = false
    }
  }

  update() {
    this.refresh()
    if (this.marchStep % 10 === 0) {
      let ctx = this.marchingCanvas.getContext('2d')
      ctx.clearRect(0, 0, this.marchingCanvas.width, this.marchingCanvas.height)
      ctx.drawImage(this.canvas, 0, 0)

      ctx.save()
      ctx.globalCompositeOperation = 'source-atop'

      // Fill with checkerboard offset by the marching ants offset.
      ctx.fillStyle = ctx.createPattern(this.checkerboard, 'repeat')
      ctx.translate(this.offsetX, this.offsetY)
      ctx.fillRect(-this.offsetX, -this.offsetY, this.marchingCanvas.width, this.marchingCanvas.height)

      ctx.restore()
      this.offsetX++
      this.offsetY++
      if (this.offsetX > 8) {
        this.offsetX = 0
      }
      if (this.offsetY > 8) {
        this.offsetY = 0
      }
    }
    this.marchStep++
  }

  setPixel(x: number, y: number, marked: boolean) {
    this.redrawPixelMask = true
    this.pixelMaskCanvasPixels.data[(y * this.pixelMaskCanvas.width + x) * 4 + 3] = marked ? 255 : 0
  }

  clear() {
    this.redrawPixelMask = true
    for (let i = 0; i < this.pixelMaskCanvasPixels.data.length; i += 4) {
      this.pixelMaskCanvasPixels.data[i + 3] = 0
    }
  }
}