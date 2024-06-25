<script lang='ts'>
  import { Canvas } from "@threlte/core"
  import Scene from "../components/3d/Scene.svelte"
  import { LoadedFile } from "../types/file"
  import { Palette } from "../types/palette"
  import { PerfMonitor } from "@threlte/extras"
  import { editor2DSettings } from "../stores/editor2d"
  
  export let file: LoadedFile
  export let palette: Palette|undefined
  export let orthographic: boolean = false
  
  let target: { x: number, y: number, z: number } = { x: 0, y: 0, z: 0 }
  let hover: { x: number, y: number, z: number }|null = null
  let cursor: [number, number, number] = [0, 0, 0]
</script>

<main style={`background: ${$editor2DSettings.backgroundColor}`}>
  <Canvas>
    <!--PerfMonitor anchorX={'right'} anchorY={'bottom'} /-->
    <Scene
      bind:target
      bind:hover
      bind:cursor
      file={file}
      palette={palette}
      orthographic={orthographic}
    />
  </Canvas>
  <menu>
    <section class='cursor'>
      <span>hover: </span><span>{hover?.x??'-'}</span><span>{hover?.y??'-'}</span><span>{hover?.z??'-'}</span>
      <span>target: </span><span>{target.x??'-'}</span><span>{target.y??'-'}</span><span>{target.z??'-'}</span>
      <span>cursor: </span><span>{cursor[0]}</span><span>{cursor[1]}</span><span>{cursor[2]}</span>
    </section>
  </menu>
</main>

<style>
  main {
    max-width: 100%;
    max-height: 100%;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: #000000;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
  }
  menu {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }
  .cursor {
    display: grid;
    grid-template-columns: auto auto auto auto auto auto auto auto auto auto auto auto auto;
    grid-template-rows: auto;
    font-size: 0.75rem;
    text-align: left;
    font-family: monospace;
    color: var(--cds-text-04);
  }
  .cursor span {
    min-width: 2rem;
    padding: 0.25rem;
  }
</style>