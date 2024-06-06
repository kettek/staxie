<script lang='ts'>
  import { Canvas } from "@threlte/core"
  import Editor3DScene from "../components/Editor3DScene.svelte"

</script>

<div>
  <Canvas>
    <Editor3DScene/>
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