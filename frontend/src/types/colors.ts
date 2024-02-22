function floatsToBytes(colors: number[]): number[] {
  if (colors.length <= 0) return colors
  if (colors[0] <= 1.0) {
    colors[0] = colors[0] * 255
    colors[1] = colors[1] * 255
    colors[2] = colors[2] * 255
  }
  return colors
}

function bytesToFloats(colors: number[]): number[] {
  if (colors.length <= 0) return colors
  if (colors[0] > 1.0) {
    colors[0] = colors[0] / 255
    colors[1] = colors[1] / 255
    colors[2] = colors[2] / 255
  }
  return colors
}

export function HSV2RGB(hsv: number[]): number[] {
  let hh: number, p: number, q: number, t: number, ff: number, i: number
  let rgb: number[] = []

  if (hsv[1] <= 0.0) {
    rgb[0] = hsv[2]
    rgb[1] = hsv[2]
    rgb[2] = hsv[2]
    return floatsToBytes(rgb)
  }
  hh = hsv[0]
  if (hh >= 360.0) {
    hh = 0.0
  }
  hh /= 60.0
  i = Math.floor(hh)
  ff = hh - i
  p = hsv[2] * (1.0 - hsv[1])
  q = hsv[2] * (1.0 - (hsv[1] * ff))
  t = hsv[2] * (1.0 - (hsv[1] * (1.0 - ff)))

  switch (i) {
    case 0:
      rgb[0] = hsv[2]
      rgb[1] = t
      rgb[2] = p
      break
    case 1:
      rgb[0] = q
      rgb[1] = hsv[2]
      rgb[2] = p
      break
    case 2:
      rgb[0] = p
      rgb[1] = hsv[2]
      rgb[2] = t
      break
    case 3:
      rgb[0] = p
      rgb[1] = q
      rgb[2] = hsv[2]
      break
    case 4:
      rgb[0] = t
      rgb[1] = p
      rgb[2] = hsv[2]
      break
    case 5:
    default:
      rgb[0] = hsv[2]
      rgb[1] = p
      rgb[2] = q
      break
  }
  return floatsToBytes(rgb)
}

export function RGB2HSV(rgb: number[]): number[] {
  rgb = bytesToFloats(rgb)

  let min: number, max: number, delta: number
  let hsv: number[] = []

  min = rgb[0] < rgb[1] ? rgb[0] : rgb[1]
  min = min < rgb[2] ? min : rgb[2]

  max = rgb[0] > rgb[1] ? rgb[0] : rgb[1]
  max = max > rgb[2] ? max : rgb[2]

  hsv[2] = max
  delta  = max - min

  if (delta < 0.00001) {
    hsv[1] = 0
    hsv[0] = 0
    return hsv
  }

  if (max > 0.0) {
    hsv[1] = delta / max
  } else {
    hsv[1] = 0.0
    hsv[0] = NaN
    return hsv
  }

  if (rgb[0] >= max) {
    hsv[0] = ( rgb[1] - rgb[2] ) / delta
  } else if (rgb[1] >= max) {
    hsv[0] = 2.0 + ( rgb[2] - rgb[0] ) / delta
  } else {
    hsv[0] = 4.0 + ( rgb[0] - rgb[1] ) / delta
  }

  hsv[0] *= 60.0;

  if (hsv[0] < 0.0) {
    hsv[0] += 360.0
  }
  return hsv
}
 