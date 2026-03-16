export type ArtifactStorage = {
  root: string;
};

export function createFilesystemArtifactStorage(root: string): ArtifactStorage {
  return { root };
}

