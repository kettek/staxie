<script lang='ts'>
  import { Button, Dropdown, NumberInput } from "carbon-components-svelte"
  import { type ImageReference, type ImageReferenceStore } from "../../types/imagereference"
  import { editor2DSettings } from "../../stores/editor2d"
  import { fileStates } from "../../stores/file"
  import type { LoadedFile } from "../../types/file"
  import { TrashCan } from "carbon-icons-svelte"
  import Input from "../common/Input.svelte"

  export let file: LoadedFile
  export let imageReferences: ImageReferenceStore

  let ref: ImageReference | undefined
  $: ref = $imageReferences.find(v=>v.src===$file.selectedImageReference)

  let items: { id: string, text: string }[] = []
  $: items = [
    { id: '', text: '<no reference>' },
    ...$imageReferences.map(v=> ({ id: v.src, text: v.src }))
  ]

  function handleSelect(e: CustomEvent<{ selectedItem: { id: string, text: string } }>) {
    file.selectedImageReference = e.detail.selectedItem.id
    file.refresh()
  }
  function removeSelected() {
    imageReferences.remove(file.selectedImageReference)
    file.selectedImageReference = ''
    file.refresh()
  }
  function handleX(e: CustomEvent<number | null>) {
    if (ref) {
      ref.x = e.detail ?? 0
      imageReferences.replace(ref)
    }
  }
  function handleY(e: CustomEvent<number | null>) {
    if (ref) {
      ref.y = e.detail ?? 0
      imageReferences.replace(ref)
    }
  }
  function handleZoom(e: CustomEvent<number | null>) {
    if (ref) {
      ref.zoom = e.detail ?? 0
      imageReferences.replace(ref)
    }
  }
  function handleOpacity(e: CustomEvent<number | null>) {
    if (ref) {
      ref.opacity = e.detail ?? 0
      imageReferences.replace(ref)
    }
  }
  function handleOvertop(e: CustomEvent<boolean>) {
    if (ref) {
      ref.overtop = e.detail
      imageReferences.replace(ref)
    }
  }
</script>

<Dropdown size="sm" hideLabel selectedId={$file.selectedImageReference} items={items} on:select={handleSelect}/>
{#if ref}
  <Button size="small" kind="ghost" icon={TrashCan} on:click={removeSelected} />
  <aside>
    <Input type='number' width={4} size='small' value={ref.x} step={1} on:change={handleX} on:input={handleX}>
      <svelte:fragment slot='label'>x:</svelte:fragment>
    </Input>
    <Input type='number' width={4} size='small' value={ref.y} step={1} on:change={handleY} on:input={handleY}>
      <svelte:fragment slot='label'>y:</svelte:fragment>
    </Input>
    <Input type='number' width={4} size='small' value={ref.zoom} step={1} on:change={handleZoom} on:input={handleZoom}>
      <svelte:fragment slot='label'>zoom:</svelte:fragment>
    </Input>
    <Input type='number' width={4} size='small' step={0.05} value={ref.opacity} on:change={handleOpacity} on:input={handleOpacity}>
      <svelte:fragment slot='label'>opacity:</svelte:fragment>
    </Input>
    <Input type='checkbox' size='small' checked={ref.overtop} on:change={handleOvertop} on:input={handleOvertop}>
      <svelte:fragment slot='label'>overtop:</svelte:fragment>
    </Input>
  </aside>
{/if}

<style>
  input {
    width: 3rem;
  }
  aside {
    display: grid;
    grid-template-columns: auto auto auto auto auto;
    grid-template-rows: minmax(0, 1fr);
  }
</style>