<!--
  @component
  
  This component provides a modal for setting the image's color mode.
-->
<script lang='ts'>
  import { Canvas } from '../types/canvas'
  import { LoadedFile } from '../types/file'
  import { RadioButtonGroup, RadioButton } from 'carbon-components-svelte'

  import {
    ModalHeader,
    ModalBody,
    ModalFooter,
    NumberInput,
    Checkbox,
  } from "carbon-components-svelte"

  export let open: boolean = false
  export let file: LoadedFile

  export let indexed: boolean = true
  $: indexed = $file.canvas.isIndexed
</script>

<ModalHeader label="Change Color Mode"/>
<ModalBody>
  <RadioButtonGroup
    legendText="Color Mode"
    name="colorMode"
    selected={indexed ? "indexed" : "truecolor"}
  >
    <RadioButton labelText="Indexed" value="indexed" on:change={() => indexed = true} />
    <RadioButton labelText="Truecolor" value="truecolor" on:change={() => indexed = false} />
  </RadioButtonGroup>
</ModalBody>
<ModalFooter
  primaryButtonText="Apply"
  secondaryButtonText="Cancel"
  on:click:button--secondary={() => open = false}
/>

