export type VoxelEvent = {
  position: {
    x: number;
    y: number;
    z: number;
  };
  face: {
    x: number;
    y: number;
    z: number;
  };
  original: CustomEvent;
};

export type VoxelClickEvent = VoxelEvent & {
  button: number;
}