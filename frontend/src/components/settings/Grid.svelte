<!--
  @component

  This component provides settings for adjusting the grid.
-->
<script lang="ts">
  import { Column, Grid, Row } from 'carbon-components-svelte'
  import { editor2DSettings, editor2DSettingsDefault } from '../../stores/editor2d'
  import Input from '../common/Input.svelte'
  import SettingsInput from '../common/SettingsInput.svelte'
</script>

<Grid narrow condensed fullWidth>
  <Column>
    <Row>
      <SettingsInput noPadding labelWidth="10" type="number" id="size" label="Grid: Major Size" min={1} max={512} step={1} bind:value={$editor2DSettings.gridMajorSize} defaultValue={editor2DSettingsDefault.gridMajorSize} />
    </Row>
    <Row>
      <Input type="color" id="color1" noPadding labelWidth="10" label="Grid: Major Color" bind:value={$editor2DSettings.gridMajorColor} />
      <SettingsInput noPadding id="color1" bind:value={$editor2DSettings.gridMajorColor} defaultValue={editor2DSettingsDefault.gridMajorColor} />
    </Row>
    <Row>
      <SettingsInput noPadding labelWidth="10" type="number" id="size" label="Grid: Minor Size" min={1} max={512} step={1} bind:value={$editor2DSettings.gridMinorSize} defaultValue={editor2DSettingsDefault.gridMinorSize} />
    </Row>
    <Row>
      <Input type="color" id="color2" noPadding labelWidth="10" label="Grid: Minor Color" bind:value={$editor2DSettings.gridMinorColor} />
      <SettingsInput noPadding id="color2" bind:value={$editor2DSettings.gridMinorColor} defaultValue={editor2DSettingsDefault.gridMinorColor} />
    </Row>
  </Column>
</Grid>
