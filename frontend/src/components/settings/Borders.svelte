<!--
  @component

  This component is a modal settings dialog for changing the border colors for the 2D view.
-->
<script lang="ts">
  import { Column, Grid, Modal, Row, TextInput } from 'carbon-components-svelte'
  import { editor2DSettings } from '../../stores/editor2d'
  import Input from '../common/Input.svelte'
</script>

<Grid narrow condensed fullWidth>
  <Column>
    <Row>
      <Input labelWidth="10" type="color" label="Slice Border Color" bind:value={$editor2DSettings.sliceBorderColor} />
      <Input type="text" bind:value={$editor2DSettings.sliceBorderColor} />
    </Row>
    <Row>
      <Input labelWidth="10" type="color" label="Frame Border Color" bind:value={$editor2DSettings.frameBorderColor} />
      <Input type="text" bind:value={$editor2DSettings.frameBorderColor} />
    </Row>
    <Row>
      <Input labelWidth="10" type="color" label="Animation Border Color" bind:value={$editor2DSettings.animationBorderColor} />
      <Input type="text" bind:value={$editor2DSettings.animationBorderColor} />
    </Row>
    <Row>
      <Input labelWidth="10" type="color" label="Stack Border Color" bind:value={$editor2DSettings.stackBorderColor} />
      <Input type="text" bind:value={$editor2DSettings.stackBorderColor} />
    </Row>
  </Column>
</Grid>
