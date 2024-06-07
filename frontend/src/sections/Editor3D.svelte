<script lang='ts'>
  import { Canvas } from "@threlte/core"
  import Scene from "../components/3d/Scene.svelte"
  import { LoadedFile } from "../types/file"
  import { Palette } from "../types/palette"
  
  export let file: LoadedFile
  export let palette: Palette|undefined
  export let orthographic: boolean = false
</script>

<div>
  <Canvas>
    <Scene
      file={file}
      palette={palette}
      orthographic={orthographic}
    />
  </Canvas>
</div>

<style>
  div {
    max-width: 100%;
    max-height: 100%;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: #000000;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
  }
</style>