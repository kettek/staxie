<script lang='ts'>
  import { T } from "@threlte/core"
  import { TransformControls } from "@threlte/extras"
  import { BoxGeometry } from "three"
  import { createEventDispatcher } from "svelte"

  const dispatch = createEventDispatcher()
  export let position: [number, number, number] = [0, 0, 0]
  export let offset: [number, number, number] = [0, 0, 0]
  function onPositionChange(next: [number, number, number]) {
    dispatch('move', next)
  }
  function onmouseup(e: MouseEvent) {
    dispatch('release', {})
  }
</script>

<T.Group
  position={offset}
>
  <TransformControls
    translationSnap={1}
    position={[position[0], position[1], position[2]]}
    on:objectChange={(e) => {onPositionChange([e.target.object.position.x, e.target.object.position.y, e.target.object.position.z])}}
    on:pointerup={onpointerup}
    on:mouseUp={onmouseup}
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