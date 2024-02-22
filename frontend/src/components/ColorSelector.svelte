<script lang='ts'>
  export let red: number = 255
  export let green: number = 0
  export let blue: number = 0
  export let alpha: number = 0
  
  let hue: number = 0
  let saturation: number = 0
  let value: number = 0
</script>

<main>
  <div class="hsv">
    <div class='hsv_hue' style="background: rgb({red}, {green}, {blue})"></div>
    <div class='hsv_saturation'></div>
    <div class='hsv_value'></div>
  </div>
  <div class='sv'>
  </div>
  <div class='slider'>
    <div class='hue' style='width: 100%; height: 1em;'></div>
  </div>
  <div class='slider'>
    <span class="checkerboard"></span>
    <div class='alpha' style='width: 100%; height: 1em;'></div>
  </div>
</main>

<style>
  .slider {
    position: relative;
    width: 100%;
    display: flex;
  }
  .hsv {
    min-height: 9em;
    width: 100%;
    border: 1px solid red;
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
    background-image: linear-gradient(to right,
      transparent 0%,
      rgba(255, 0, 0, 1) 100%
    );
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
</style>