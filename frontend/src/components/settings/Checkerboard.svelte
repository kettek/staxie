<!--
  @component

  This component is provides settings for changing the checkerboard background.
-->
<script lang="ts">
  import { Column, Grid, Modal, NumberInput, Row, TextInput } from 'carbon-components-svelte'
  import { editor2DSettings } from '../../stores/editor2d'
  import Input from '../common/Input.svelte'
</script>

<Grid narrow condensed fullWidth>
  <Column>
    <Row>
      <Input labelWidth="10" type="number" label="Checkerboard Size" min={1} max={512} step={1} bind:value={$editor2DSettings.checkerboardSize} />
    </Row>
    <Row>
      <Input labelWidth="10" type="color" label="Checkerboard Color 1" bind:value={$editor2DSettings.checkerboardColor1} />
      <Input bind:value={$editor2DSettings.checkerboardColor1} />
    </Row>
    <Row>
      <Input labelWidth="10" type="color" label="Checkerboard Color 2" bind:value={$editor2DSettings.checkerboardColor2} />
      <Input bind:value={$editor2DSettings.checkerboardColor2} />
    </Row>
  </Column>
</Grid>
