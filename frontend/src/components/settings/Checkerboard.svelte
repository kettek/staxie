<!--
  @component

  This component is provides settings for changing the checkerboard background.
-->
<script lang="ts">
  import { Checkbox, Column, Grid, Modal, NumberInput, Row, TextInput } from 'carbon-components-svelte'
  import { editor2DSettings, editor2DSettingsDefault } from '../../stores/editor2d'
  import Input from '../common/Input.svelte'
  import { Bee } from 'carbon-icons-svelte'
  import Button from '../common/Button.svelte'
  import SettingsInput from '../common/SettingsInput.svelte'
</script>

<Grid narrow condensed fullWidth>
  <Column>
    <Row>
      <Checkbox labelText="Show Checkerboard" bind:checked={$editor2DSettings.showCheckerboard}></Checkbox>
    </Row>
    <Row>
      <SettingsInput noPadding labelWidth="10" type="number" label="Checkerboard Size" min={1} max={512} step={1} bind:value={$editor2DSettings.checkerboardSize} defaultValue={editor2DSettingsDefault.checkerboardSize} />
    </Row>
    <Row>
      <Input noPadding labelWidth="10" type="color" label="Checkerboard Color 1" bind:value={$editor2DSettings.checkerboardColor1} />
      <SettingsInput noPadding bind:value={$editor2DSettings.checkerboardColor1} defaultValue={editor2DSettingsDefault.checkerboardColor1} />
    </Row>
    <Row>
      <Input noPadding labelWidth="10" type="color" label="Checkerboard Color 2" bind:value={$editor2DSettings.checkerboardColor2} />
      <SettingsInput noPadding bind:value={$editor2DSettings.checkerboardColor2} defaultValue={editor2DSettingsDefault.checkerboardColor2} />
    </Row>
  </Column>
</Grid>
