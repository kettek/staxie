<script lang='ts'>
  import { LoadedFile } from '../types/file'
  import { Open, type ImportStaxie, type ImportStack, type ImportAnimation, type ImportFrame, type ImportSlice } from '../globals/importers/vio'
  import { Button, Checkbox, ComposedModal, ModalBody, ModalFooter, ModalHeader, StructuredList, StructuredListBody, StructuredListCell, StructuredListHead, StructuredListRow, TextInput } from 'carbon-components-svelte'
  import { onMount } from 'svelte'
  import { OpenFileBytes, SaveFileBytes } from '../../wailsjs/go/main/App'
  import YAML from 'yaml'

  export let file: LoadedFile
  export let open: boolean = false

  type VioSprite = {
    animations: { [key: string]: 
      {
        sets: { [key: string]:
          {
            subsets: { [key: string]:
              {
                frames: {
                  x: number,
                  y: number,
                  width: number,
                  height: number,
                  time: number
                }[]
              }
            }
          }
        }
      }
    }
  }

  let path: string
  let parsed: VioSprite
  let staxie: ImportStaxie = {
    stacks: [],
    frameWidth: 0,
    frameHeight: 0,
  }

  async function openFile() {
    const p = await Open()
    if (p) {
      parsed = await tryOpen(p)
      path = p
      updateMappings()
    }
  }

  function update() {
    console.log('updating', path)
  }

  async function tryOpen(p: string): Promise<VioSprite> {
    let bytes = atob((await OpenFileBytes(p)) as unknown as string)
    const yml = YAML.parse(bytes)
    return yml
  }

  function updateMappings() {
    staxie = {
      stacks: [],
      frameWidth: 0,
      frameHeight: 0,
    }

    let frameSizeCounts: Record<string, number> = {}
    for (let [animName, anim] of Object.entries(parsed.animations)) {
      const staxieStackName = animName
      let stack: ImportStack = {
        name: staxieStackName,
        animations: [],
        sliceCount: 0,
      }

      for (let [setName, set] of Object.entries(anim.sets)) {
        const staxieAnimationName = setName.split('_')[0]
        const staxieAnimationFrame = parseInt(setName.split('_')[1])
        let animation: ImportAnimation|undefined = stack.animations.find(a => a.name === staxieAnimationName)
        if (!animation) {
          animation = {
            name: staxieAnimationName,
            frames: [],
            frameTime: 0,
          }
          stack.animations.push(animation)
        }
        animation.frames[staxieAnimationFrame] = []

        for (let [subsetName, subset] of Object.entries(set.subsets)) {
          const staxieSliceIndex = parseInt(subsetName)
          if (staxieSliceIndex > stack.sliceCount) {
            stack.sliceCount = staxieSliceIndex
          }
          if (subset.frames.length === 1) {
            const frame = subset.frames[0]
            if (frame.time > animation.frameTime) {
              animation.frameTime = frame.time
            }
            let slice: ImportSlice = {
              x: frame.x,
              y: frame.y,
              origSubset: subset,
            }
            animation.frames[staxieAnimationFrame][staxieSliceIndex] = slice
            frameSizeCounts[`${frame.width}x${frame.height}`] = (frameSizeCounts[`${frame.width}x${frame.height}`] || 0) + 1
          }
        }
      }
      staxie.stacks.push(stack)
    }
    let bestFrameSize = Object.keys(frameSizeCounts).sort((a, b) => frameSizeCounts[b] - frameSizeCounts[a])[0]

    staxie.frameWidth = parseInt(bestFrameSize.split('x')[0])
    staxie.frameHeight = parseInt(bestFrameSize.split('x')[1])

    console.log('alright, we got the following', staxie)
  }

  onMount(async () => {
    // TODO: This ain't right.
    // Trim our file's png extension.
    let fpath = file.filepath
    if (!fpath.endsWith('.png')) {
      return
    }
    fpath = fpath.substring(0, fpath.length - 4) + '.yaml'

    parsed = await tryOpen(fpath)
    path = fpath
    updateMappings()
  })
</script>

<ComposedModal bind:open size="sm" preventCloseOnClickOutside on:click:button--primary={update}>
  <ModalHeader label="Vio Updater"/>
  <ModalBody>
    <main>
      <section>
        <TextInput hideLabel disabled value={path} />
        <Button on:click={openFile}>File...</Button>
      </section>
      <section>
        <StructuredList condensed>
          <StructuredListHead>
            <StructuredListRow head>
              <StructuredListCell>Update Set↔Stack</StructuredListCell>
              <StructuredListCell>Info</StructuredListCell>
            </StructuredListRow>
          </StructuredListHead>
          <StructuredListBody>
            {#each staxie.stacks as stack, i}
              <StructuredListRow>
                <StructuredListCell>
                  <Checkbox labelText={stack.name} />
                </StructuredListCell>
                <StructuredListCell>
                  {stack.sliceCount} slices {stack.animations.length} animations
                </StructuredListCell>
              </StructuredListRow>
            {/each}
          </StructuredListBody>
        </StructuredList>
      </section>
    </main>
  </ModalBody>
  <ModalFooter
    primaryButtonText="Update"
    secondaryButtonText="Cancel"
    primaryButtonDisabled={!path}
    on:click:button--secondary={() => open = false}
  />
</ComposedModal>