export interface NoteData { title: string; content: string; tags: string[]; }
export interface AppSettings { vaultName: string; folderPath: string; }
export enum ViewState { EDITING = 'EDITING', PREVIEW = 'PREVIEW' }
