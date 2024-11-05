<!--
  @component

  This component is a modal settings dialog for changing the border colors for the 2D view.
-->
<script lang="ts">
  import { Column, Grid, Modal, Row, TextInput } from 'carbon-components-svelte'
  import { editor2DSettings, editor2DSettingsDefault } from '../../stores/editor2d'
  import Input from '../common/Input.svelte'
  import SettingsInput from '../common/SettingsInput.svelte'
</script>

<Grid narrow condensed fullWidth>
  <Column>
    <Row>
      <Input labelWidth="10" type="color" label="Slice Border Color" bind:value={$editor2DSettings.sliceBorderColor} />
      <SettingsInput type="text" bind:value={$editor2DSettings.sliceBorderColor} defaultValue={editor2DSettingsDefault.sliceBorderColor} />
    </Row>
    <Row>
      <Input labelWidth="10" type="color" label="Frame Border Color" bind:value={$editor2DSettings.frameBorderColor} />
      <SettingsInput type="text" bind:value={$editor2DSettings.frameBorderColor} defaultValue={editor2DSettingsDefault.frameBorderColor} />
    </Row>
    <Row>
      <Input labelWidth="10" type="color" label="Animation Border Color" bind:value={$editor2DSettings.animationBorderColor} />
      <SettingsInput type="text" bind:value={$editor2DSettings.animationBorderColor} defaultValue={editor2DSettingsDefault.animationBorderColor} />
    </Row>
    <Row>
      <Input labelWidth="10" type="color" label="Stack Border Color" bind:value={$editor2DSettings.stackBorderColor} />
      <SettingsInput type="text" bind:value={$editor2DSettings.stackBorderColor} defaultValue={editor2DSettingsDefault.stackBorderColor} />
    </Row>
  </Column>
</Grid>
