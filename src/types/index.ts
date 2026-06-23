export interface FileItem {
  id: string;
  fileName: string;
  originalName: string;
  fileToken: string;
  fileReference: string;
  fileType: "original" | "lillybelle" | "arcep" | string;
  azurePath: string | null;
  isReady: boolean;
  uploadedAt: string;
}

export interface FileGroup {
  reference: string;
  originalName: string;
  uploadedAt: string;
  files: FileItem[];
}
