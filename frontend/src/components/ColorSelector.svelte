<script lang='ts'>
  import { HSV2RGB, RGB2HSV } from "../types/colors"

  export let red: number = 255
  export let green: number = 0
  export let blue: number = 0
  export let alpha: number = 255
  
  let hue: number = 0
  let saturation: number = 0
  let value: number = 0

  $: {
    let [h, s, v] = RGB2HSV([red, green, blue])
    hue = h
    saturation = s
    value = v
  }

  let fullRed: number = 255
  let fullGreen: number = 0
  let fullBlue: number = 0

  $: {
    let [r, g, b] = HSV2RGB([hue, 1, 1])
    fullRed = r
    fullGreen = g
    fullBlue = b
  }

  function updateColor() {
    let [r, g, b] = HSV2RGB([hue, saturation, value])
    red = Math.floor(r)
    green = Math.floor(g)
    blue = Math.floor(b)
  }

  function dragHSV(node) {
    node.addEventListener('mousedown', start)

    function start(e: MouseEvent) {
      if (e.button !== 0) return
      let rect = node.getBoundingClientRect()
      let x = e.clientX - rect.left
      let y = e.clientY - rect.top
      x = Math.max(0, Math.min(x, rect.width))
      y = Math.max(0, Math.min(y, rect.height))
      let w = rect.width
      let h = rect.height
      saturation = x / w
      value = 1.0 - y / h

      updateColor()

      e.preventDefault()
      window.addEventListener('mousemove', move)
      window.addEventListener('mouseup', stop)
    }
    function stop(e: MouseEvent) {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', stop)
    }
    function move(e: MouseEvent) {
      let rect = node.getBoundingClientRect()
      let x = e.clientX - rect.left
      let y = e.clientY - rect.top
      x = Math.max(0, Math.min(x, rect.width))
      y = Math.max(0, Math.min(y, rect.height))
      let w = rect.width
      let h = rect.height
      saturation = x / w
      value = 1.0 - y / h
      updateColor()
    }
  }

  function dragHue(node) {
    node.addEventListener('mousedown', start)

    function start(e: MouseEvent) {
      if (e.button !== 0) return
      let rect = node.getBoundingClientRect()
      let x = e.clientX - rect.left
      x = Math.max(0, Math.min(x, rect.width))
      let w = rect.width
      hue = x / w * 360
      updateColor()

      e.preventDefault()
      window.addEventListener('mousemove', move)
      window.addEventListener('mouseup', stop)
    }
    function stop(e: MouseEvent) {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', stop)
    }
    function move(e: MouseEvent) {
      let rect = node.getBoundingClientRect()
      let x = e.clientX - rect.left
      x = Math.max(0, Math.min(x, rect.width))
      let w = rect.width
      hue = x / w * 360
      updateColor()
    }
  }
  
  function dragAlpha(node) {
    node.addEventListener('mousedown', start)

    function start(e: MouseEvent) {
      if (e.button !== 0) return
      let rect = node.getBoundingClientRect()
      let x = e.clientX - rect.left
      x = Math.max(0, Math.min(x, rect.width))
      let w = rect.width
      alpha = Math.floor(x / w * 255)

      e.preventDefault()
      window.addEventListener('mousemove', move)
      window.addEventListener('mouseup', stop)
    }
    function stop(e: MouseEvent) {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', stop)
    }
    function move(e: MouseEvent) {
      let rect = node.getBoundingClientRect()
      let x = e.clientX - rect.left
      x = Math.max(0, Math.min(x, rect.width))
      let w = rect.width
      alpha = Math.floor(x / w * 255)
    }
  }

</script>

<main>
  <div class="hsv" use:dragHSV>
    <div class='hsv_hue' style="background: rgb({fullRed}, {fullGreen}, {fullBlue})"></div>
    <div class='hsv_saturation'></div>
    <div class='hsv_value'></div>
    <div class='hsv_cursor' style="left: {saturation*100}%; top: {100 - value*100}%">
      <div class='hsv_cursor-left'></div>
      <div class='hsv_cursor-right'></div>
      <div class='hsv_cursor-top'></div>
      <div class='hsv_cursor-bottom'></div>
    </div>
  </div>
  <div class='sv'>
  </div>
  <div class='slider' use:dragHue>
    <div class='hue' style='width: 100%; height: 1em;'></div>
    <div class='cursor' style='left: {hue/360*100}%;'></div>
  </div>
  <div class='slider' use:dragAlpha>
    <span class="checkerboard"></span>
    <div class='alpha' style='width: 100%; height: 1em; background-image: linear-gradient(to right, transparent 0%, rgb({red}, {green}, {blue}) 100%);'></div>
    <div class='cursor' style='left: {alpha/255*100}%;'></div>
  </div>
</main>

<style>
  .slider {
    position: relative;
    width: 100%;
    display: flex;
  }
  .hsv {
    position: relative;
    min-height: 9em;
    width: 100%;
    overflow: hidden;
    user-select: none;
  }
  .hsv_hue {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  .hsv_saturation {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image:
      linear-gradient(to right,
      rgba(255, 255, 255, 255) 0%,
      rgba(255, 255, 255, 0) 100%)
    ;
  }
  .hsv_value {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image:
      linear-gradient(to bottom,
      transparent 0%,
      rgb(0, 0, 0) 100%)
    ;
  }
  .hsv_cursor {
    position: absolute;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .hsv_cursor-left {
    position: absolute;
    left: -100%;
    top: -2px;
    margin-left: -1px;
    width: 100%;
    height: 3px;
    background: black;
    border: 1px solid rgba(255,255,255,0.5);
    border-right: 0;
    border-left: 0;
  }
  .hsv_cursor-right {
    position: absolute;
    left: 0;
    top: -2px;
    width: 100%;
    height: 3px;
    background: black;
    border: 1px solid rgba(255,255,255,0.5);
    border-right: 0;
    border-left: 0;
  }
  .hsv_cursor-bottom {
    position: absolute;
    left: -2px;
    top: 0;
    width: 3px;
    height: 100%;
    background: black;
    border: 1px solid rgba(255,255,255,0.5);
    border-bottom: 0;
    border-top: 0;
  }
  .hsv_cursor-top {
    position: absolute;
    left: -2px;
    top: -100%;
    margin-top: -1px;
    width: 3px;
    height: 100%;
    background: black;
    border: 1px solid rgba(255,255,255,0.5);
    border-bottom: 0;
    border-top: 0;
  }
  .hue {
    background-image: linear-gradient(to left,
      #ff0000, #ff0080,
      #ff00ff, #8000ff,
      #0000ff, #0080ff,
      #00ffff, #00ff80,
      #00ff00, #80ff00,
      #ffff00, #ff8000,
      #ff0000
    );
  }
  .alpha {
    z-index: 0;
  }
  .checkerboard {
    pointer-events: none;
    position: absolute;
    z-index: 0;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 100%;
    background-image: linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%);
    background-size: 10px 10px;
    background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
  }
  .slider {
    position: relative;
    user-select: none;
    overflow: hidden;
  }
  .cursor {
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    border: 1px solid black;
    border-top: 0;
    border-bottom: 0;
    margin-left: -2px;
    z-index: 1;
  }
</style>