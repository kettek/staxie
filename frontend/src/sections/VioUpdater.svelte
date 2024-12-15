<script lang="ts">
  import { LoadedFile } from '../types/file'
  import { Open, type ImportStaxie, type ImportStack, type ImportAnimation, type ImportFrame, type ImportSlice } from '../globals/importers/vio'
  import { Button, Checkbox, ComposedModal, ModalBody, ModalFooter, ModalHeader, StructuredList, StructuredListBody, StructuredListCell, StructuredListHead, StructuredListRow, TextInput } from 'carbon-components-svelte'
  import { onMount } from 'svelte'
  import { OpenFileBytes, SaveFileBytes } from '../../wailsjs/go/main/App'
  import YAML from 'yaml'

  export let file: LoadedFile
  export let open: boolean = false

  type VioSprite = {
    animations: { [key: string]: VioSpriteAnimation }
  }
  type VioSpriteAnimation = {
    sets: { [key: string]: VioSpriteSet }
  }
  type VioSpriteSet = {
    subsets: { [key: string]: VioSpriteSubset }
  }
  type VioSpriteSubset = {
    frames: VioSpriteFrame[]
  }
  type VioSpriteFrame = {
    x: number
    y: number
    width: number
    height: number
    time: number
  }

  let path: string
  let parsed: VioSprite
  let vioImport: ImportStaxie = {
    stacks: [],
    frameWidth: 0,
    frameHeight: 0,
  }

  type Mapping = {
    vio: boolean
    staxie: boolean
    update?: boolean
    remove?: boolean
  }
  let mappings: Record<string, Mapping> = {}
  $: {
    for (let stack of vioImport.stacks) {
      if (!mappings[stack.name]) {
        mappings[stack.name] = { vio: true, staxie: false }
      } else {
        mappings[stack.name].vio = true
      }
    }
    for (let stack of $file.stacks) {
      if (!mappings[stack.name]) {
        mappings[stack.name] = { vio: false, staxie: true }
      } else {
        mappings[stack.name].staxie = true
        if (mappings[stack.name].vio) {
          mappings[stack.name].update = true
        }
      }
    }
  }

  async function openFile() {
    const p = await Open()
    if (p) {
      parsed = await tryOpen(p)
      path = p
      updateMappings()
    }
  }

  async function update() {
    applyChanges()
    let newYaml = YAML.stringify(parsed)
    try {
      await SaveFileBytes(path, btoa(newYaml) as any)
    } catch (e) {
      alert(e)
    }
    open = false
  }

  async function tryOpen(p: string): Promise<VioSprite> {
    let bytes = atob((await OpenFileBytes(p)) as unknown as string)
    const yml = YAML.parse(bytes)
    return yml
  }

  function updateMappings() {
    vioImport = {
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
        origAnim: anim,
      }

      for (let [setName, set] of Object.entries(anim.sets)) {
        const staxieAnimationName = setName.split('_')[0]
        const staxieAnimationFrame = parseInt(setName.split('_')[1])
        let animation: ImportAnimation | undefined = stack.animations.find((a) => a.name === staxieAnimationName)
        if (!animation) {
          animation = {
            name: staxieAnimationName,
            frames: [],
            frameTime: 0,
            origSet: set,
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
            //frameSizeCounts[`${frame.width}x${frame.height}`] = (frameSizeCounts[`${frame.width}x${frame.height}`] || 0) + 1
          }
        }
      }
      vioImport.stacks.push(stack)
    }
    /*let bestFrameSize = Object.keys(frameSizeCounts).sort((a, b) => frameSizeCounts[b] - frameSizeCounts[a])[0]

    vioImport.frameWidth = parseInt(bestFrameSize.split('x')[0])
    vioImport.frameHeight = parseInt(bestFrameSize.split('x')[1])*/
    vioImport.frameWidth = file.frameWidth
    vioImport.frameHeight = file.frameHeight
  }

  function fileToVio(): VioSprite {
    let vio: VioSprite = {
      animations: {},
    }
    for (let stack of $file.stacks) {
      let vioAnim: VioSpriteAnimation = {
        sets: {},
      }

      for (let anim of stack.animations) {
        for (let [frameIndex, frame] of anim.frames.entries()) {
          let vioSet: VioSpriteSet = {
            subsets: {},
          }
          for (let [sliceIndex, slice] of frame.slices.entries()) {
            let vioSubset: VioSpriteSubset = {
              frames: [],
            }

            let vioFrame: VioSpriteFrame = {
              x: slice.x,
              y: slice.y,
              width: vioImport.frameWidth,
              height: vioImport.frameHeight,
              time: anim.frameTime,
            }

            vioSubset.frames.push(vioFrame)
            vioSet.subsets[sliceIndex] = vioSubset
          }

          vioAnim.sets[`${anim.name}_${frameIndex < 10 ? '0' + frameIndex : frameIndex}`] = vioSet
        }
      }

      vio.animations[stack.name] = vioAnim
    }
    return vio
  }

  function applyChanges() {
    let vioSprite = fileToVio()

    for (let [name, mapping] of Object.entries(mappings)) {
      if (mapping.remove) {
        delete parsed.animations[name]
      } else if (mapping.update) {
        if (parsed.animations[name]) {
          for (let [setName, set] of Object.entries(vioSprite.animations[name].sets)) {
            if (parsed.animations[name].sets[setName]) {
              for (let [subsetName, subset] of Object.entries(set.subsets)) {
                if (parsed.animations[name].sets[setName].subsets[subsetName]) {
                  for (let frameIndex = 0; frameIndex < subset.frames.length; frameIndex++) {
                    if (parsed.animations[name].sets[setName].subsets[subsetName].frames[frameIndex]) {
                      parsed.animations[name].sets[setName].subsets[subsetName].frames[frameIndex] = {
                        ...parsed.animations[name].sets[setName].subsets[subsetName].frames[frameIndex],
                        ...subset.frames[frameIndex],
                      }
                    } else {
                      parsed.animations[name].sets[setName].subsets[subsetName].frames[frameIndex] = subset.frames[frameIndex]
                    }
                  }
                  if (parsed.animations[name].sets[setName].subsets[subsetName].frames.length > subset.frames.length) {
                    parsed.animations[name].sets[setName].subsets[subsetName].frames = parsed.animations[name].sets[setName].subsets[subsetName].frames.slice(0, subset.frames.length)
                  }
                } else {
                  parsed.animations[name].sets[setName].subsets[subsetName] = subset
                }
              }
              // Remove any extra subsets
              if (Object.keys(parsed.animations[name].sets[setName].subsets).length > Object.keys(vioSprite.animations[name].sets[setName].subsets).length) {
                for (let subsetName of Object.keys(parsed.animations[name].sets[setName].subsets)) {
                  if (!vioSprite.animations[name].sets[setName].subsets[subsetName]) {
                    delete parsed.animations[name].sets[setName].subsets[subsetName]
                  }
                }
              }
            } else {
              parsed.animations[name].sets[setName] = set
            }
          }
          // Remove any extra sets
          if (Object.keys(parsed.animations[name].sets).length > Object.keys(vioSprite.animations[name].sets).length) {
            for (let setName of Object.keys(parsed.animations[name].sets)) {
              if (!vioSprite.animations[name].sets[setName]) {
                delete parsed.animations[name].sets[setName]
              }
            }
          }
        } else {
          // Add
          parsed.animations[name] = vioSprite.animations[name]
        }
      }
    }
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
  <ModalHeader label="Vio Updater" />
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
              <StructuredListCell>Set/Stack</StructuredListCell>
              <StructuredListCell>Vio</StructuredListCell>
              <StructuredListCell>Staxie</StructuredListCell>
              <StructuredListCell>Add/Merge</StructuredListCell>
              <StructuredListCell>Remove</StructuredListCell>
            </StructuredListRow>
          </StructuredListHead>
          <StructuredListBody>
            {#each Object.entries(mappings) as [name, mapping]}
              <StructuredListRow>
                <StructuredListCell>{name}</StructuredListCell>
                <StructuredListCell>
                  <input type="checkbox" disabled checked={mapping.vio} />
                </StructuredListCell>
                <StructuredListCell>
                  <input type="checkbox" disabled checked={mapping.staxie} />
                </StructuredListCell>
                <StructuredListCell>
                  <input type="checkbox" disabled={!mapping.staxie} bind:checked={mapping.update} />
                </StructuredListCell>
                <StructuredListCell>
                  <input type="checkbox" disabled={mapping.staxie} bind:checked={mapping.remove} />
                </StructuredListCell>
              </StructuredListRow>
            {/each}
          </StructuredListBody>
        </StructuredList>
      </section>
    </main>
  </ModalBody>
  <ModalFooter primaryButtonText="Update" secondaryButtonText="Cancel" primaryButtonDisabled={!path} on:click:button--secondary={() => (open = false)} />
</ComposedModal>
