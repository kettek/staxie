<script lang='ts'>
  import { T } from "@threlte/core"
  import { TransformControls } from "@threlte/extras"
  import { BoxGeometry, Group, MeshBasicMaterial, type Object3DEventMap } from "three"
  import { isKeyActive } from "../Shortcuts.svelte"

  export let position: [number, number, number] = [0, 0, 0]
  export let offset: [number, number, number] = [0, 0, 0]
  export let selection: [[number, number, number], [number, number, number]] = [[0, 0, 0], [0, 0, 0]]
  export let boxMode: boolean = false
  export let alt: boolean = false
  function isSelectionSame() { return selection[0][0] === selection[1][0] && selection[0][1] === selection[1][1] && selection[0][2] === selection[1][2] }
  function onPositionChange(next: [number, number, number]) {
    if (alt) {
      position = next
      selection[1] = next
      return
    }
    if (boxMode) {
      position = next
      selection[0] = next
      return
    }
    if (isKeyActive('shift')) {
      if (isSelectionSame()) {
        selection[0] = position
        selection[1] = next
      } else {
        selection[1] = next
      }
      position = position
    } else {
      selection[0] = next
      selection[1] = next
      position = next
    }
  }
</script>

<T.Group
  position={offset}
>
  <TransformControls
    translationSnap={1}
    position={[position[0], position[1], position[2]]}
    on:objectChange={(e) => {onPositionChange([e.target.object.position.x, e.target.object.position.y, e.target.object.position.z])}}
    size={0.5}
  >
    <T.Group
      position={[0, 0.5, 0]}
    >
      <T.Mesh
        visible={false}
        geometry={new BoxGeometry(1, 1, 1)}
        autoPauseOrbitControls={true}
      />
    </T.Group>
  </TransformControls>
</T.Group>