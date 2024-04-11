<!--
  @component
  
  This component is a modal that provides UI for changing the stack preview settings.
-->
<script lang='ts'>
  import { Checkbox, Column, Grid, Modal, NumberInput, Row, TextInput } from "carbon-components-svelte";

  export let showBaseSizeOutline: boolean = true
  export let baseSizeOutlineColor: string = '#00FFFF77'
  export let showSizeOutline: boolean = true
  export let sizeOutlineColor: string = '#FFFF0077'

  let pendingShowBaseSizeOutline: boolean = showBaseSizeOutline
  let pendingBaseSizeOutlineColor: string = baseSizeOutlineColor
  let pendingShowSizeOutline: boolean = showSizeOutline
  let pendingSizeOutlineColor: string = sizeOutlineColor

  $: {
    pendingShowBaseSizeOutline = showBaseSizeOutline
    pendingBaseSizeOutlineColor = baseSizeOutlineColor
    pendingShowSizeOutline = showSizeOutline
    pendingSizeOutlineColor = sizeOutlineColor
  }

  let changed: boolean = false
  $: {
    changed = showBaseSizeOutline !== pendingShowBaseSizeOutline || baseSizeOutlineColor !== pendingBaseSizeOutlineColor || showSizeOutline !== pendingShowSizeOutline || sizeOutlineColor !== pendingSizeOutlineColor
  }

  export let open: boolean = false
</script>

<Modal
  preventCloseOnClickOutside
  bind:open
  modalHeading="Stack Preview Settings"
  primaryButtonText="Apply"
  secondaryButtonText="Cancel"
  on:close={() => open = false}
  on:click:button--secondary={() => open = false}
  on:submit={() => {
    showBaseSizeOutline = pendingShowBaseSizeOutline
    baseSizeOutlineColor = pendingBaseSizeOutlineColor
    showSizeOutline = pendingShowSizeOutline
    sizeOutlineColor = pendingSizeOutlineColor
    open = false
  }}
  primaryButtonDisabled={!changed}
>
  <Grid narrow condensed fullWidth>
    <Column>
      <Row>
        <Checkbox id="showBaseSizeOutline" bind:checked={pendingShowBaseSizeOutline}>Show Base Size Outline</Checkbox>
      </Row>
      <Row>
        <TextInput id="baseSizeOutlineColor" labelText="Base Size Outline Color" bind:value={pendingBaseSizeOutlineColor}/>
      </Row>
      <Row>
        <Checkbox id="showSizeOutline" bind:checked={pendingShowSizeOutline}>Show Size Outline</Checkbox>
      </Row>
      <Row>
        <TextInput id="sizeOutlineColor" labelText="Size Outline Color" bind:value={pendingSizeOutlineColor}/>
      </Row>
    </Column>
  </Grid>
</Modal>