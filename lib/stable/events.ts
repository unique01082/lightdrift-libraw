export interface ProgressEvent {
  stage: number;
  iteration: number;
  expected: number;
}

export interface DataErrorEvent {
  offset: number;
  file: string;
}

export interface ExifTagEvent {
  tag: number;
  type: number;
  length: number;
  order: number;
}

export interface MakerNoteEvent {
  tag: number;
  type: number;
  length: number;
  order: number;
}
