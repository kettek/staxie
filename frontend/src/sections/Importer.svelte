<!--
  @component
  
  This component provides importing an indexed or RGBA PNG file with options for how to interpret columns and rows as groups and animations.
-->
<script lang='ts'>
  import { onMount } from 'svelte'
  
  import type { IndexedPNG, StaxAnimation, StaxFrame, StaxGroup, StaxSlice } from '../types/png'
  import type { Canvas } from '../types/canvas'
  
  import { Button, NumberInput, Checkbox, RadioButtonGroup, RadioButton } from 'carbon-components-svelte'
  import { Form, FormGroup, InlineNotification, Tile, Truncate } from 'carbon-components-svelte'
  import { Grid, Row, Column } from "carbon-components-svelte"

  import {
    StructuredList,
    StructuredListHead,
    StructuredListRow,
    StructuredListCell,
    StructuredListBody,
  } from "carbon-components-svelte"

  import {
    ComposedModal,
    ModalHeader,
    ModalBody,
    ModalFooter,
  } from "carbon-components-svelte"
  import { plog } from '../globals/log'

  export let valid: boolean = false
  export let open: boolean = false
  
  let width: number = 16
  let height: number = 16
  let rowBasedFrames: boolean = true
  export let canvas: Canvas
  export let png: IndexedPNG
  let img: HTMLImageElement
  let path: string = ''
  let error: string = ""
  let error2: string = ""
  let cols: number = 0
  let rows: number = 0
  let importFramesAs: 'groups' | 'animations' = 'groups'
  let groups: number = 0
  let animations: number = 0
  
  $: {
    if (img) {
      img.src = canvas?.canvas.toDataURL()
    }
  }
  
  function recalc() {
    if (!png) return
    error = ""
    error2 = ""
    
    rows = png.height / height
    cols = png.width / width

    if (rows % 1 !== 0) {
      error = 'slice size'
      error2 = 'invalid row count of: ' + rows
      return
    } 
    if (cols % 1 !== 0) {
      error = 'slice size'
      error2 = 'invalid cols count of: ' + cols
      return
    }

    png.frameWidth = width
    png.frameHeight = height

    groups = 0
    animations = 0
    if (importFramesAs === 'groups') {
      groups = rowBasedFrames ? rows : cols
      animations = 1
    } else {
      groups = 1
      animations = rowBasedFrames ? rows : cols
    }
    remakeFile()
  }

  function remakeFile() {
    png.groups = []
    let cx = 0
    let cy = 0
    for (let gi = 0; gi < groups; gi++) {
      let group: StaxGroup = {
        name: "group "+gi,
        animations: [],
        sliceCount: rowBasedFrames ? cols : rows,
      }
      for (let ai = 0; ai < animations; ai++) {
        let frames: StaxFrame[] = []
        let slices: StaxSlice[] = []
        for (let i = 0; i < (!rowBasedFrames ? rows : cols); i++) {
          slices.push({
            shading: 255,
            x: 0,
            y: 0,
          })
          if (rowBasedFrames) {
            cx++
          } else {
            cy++
          }
        }
        frames.push({
          slices,
        })

        if (rowBasedFrames) {
          cy++
          cx = 0
        } else {
          cx++
          cy = 0
        }

        let animation: StaxAnimation = {
          name: "animation "+ai,
          frames,
          frameTime: 100,
        }
        group.animations.push(animation)
      }
      png.groups.push(group)
    }
  }

  $: valid = error === ""

  onMount(() => {
    img.onload = () => {
      recalc()
    }
    recalc()
  })
</script>

<ModalHeader label="Adjust stAx import"/>
<ModalBody>
  <Form on:submit={e=>e.preventDefault()}>
    <FormGroup legendText="Import">
      <Grid condensed>
        <Row>
          <Column>
            <img bind:this={img} alt=''>
            <Tile> {png?.width} x {png?.height} </Tile>
          </Column>
        </Row>
      </Grid>
    </FormGroup>
    <FormGroup legendText="Options">
      <Grid condensed narrow>
        <Row condensed narrow>
          <Column>
            <NumberInput
              size="sm"
              min={1}
              bind:value={width}
              on:change={recalc}
              invalidText="Minimum of 1, yo."
              label="Slice Width"
            />
            <NumberInput
              size="sm"
              min={1}
              bind:value={height}
              on:change={recalc}
              invalidText="Minimum of 1, yo."
              label="Slice Height"
            />
            <Checkbox
              bind:checked={rowBasedFrames}
              on:change={recalc}
              labelText="row based animation frames"
            />
            <RadioButtonGroup
              legendText="Import animation frames as"
              bind:selected={importFramesAs}
              on:change={recalc}
            >
              <RadioButton labelText="groups" value="groups" />
              <RadioButton labelText="animations" value="animations" />
            </RadioButtonGroup>
          </Column>
          <Column>
            <StructuredList condensed>
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head>Columns</StructuredListCell>
                  <StructuredListCell head>Rows</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                <StructuredListRow>
                  <StructuredListCell noWrap>{cols}</StructuredListCell>
                  <StructuredListCell>{rows}</StructuredListCell>
                </StructuredListRow>
              </StructuredListBody>
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head>Groups</StructuredListCell>
                  <StructuredListCell head>Animations</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                <StructuredListRow>
                  <StructuredListCell noWrap>{groups}</StructuredListCell>
                  <StructuredListCell>{animations}</StructuredListCell>
                </StructuredListRow>
              </StructuredListBody>
            </StructuredList>
          </Column>
        </Row>
      </Grid>
    </FormGroup>
  </Form>
  {#if error}
    <InlineNotification
      kind="error"
      title={error}
      subtitle={error2}
    />
  {/if}
</ModalBody>
<ModalFooter
  primaryButtonText="Import"
  secondaryButtonText="Cancel"
  primaryButtonDisabled={!valid}
  on:click:button--secondary={() => open = false}
/>

<style>
  img {
    max-width: 100%;
    max-height: 100%;
    border: .5em solid black;
    background-image: linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
  }
</style>