export interface MetadataSnapshot {
  make?: string;
  model?: string;
  software?: string;
  width: number;
  height: number;
  rawWidth: number;
  rawHeight: number;
  colors: number;
  filters: number;
  iso?: number;
  shutterSpeed?: number;
  aperture?: number;
  focalLength?: number;
  timestamp?: number;
}

export interface ImageSizeSnapshot {
  width: number;
  height: number;
  rawWidth: number;
  rawHeight: number;
  topMargin: number;
  leftMargin: number;
  iWidth: number;
  iHeight: number;
}

export interface AdvancedMetadataSnapshot {
  normalizedMake?: string;
  normalizedModel?: string;
  rawCount: number;
  dngVersion: number;
  is_foveon: number;
  colorMatrix: [number[], number[], number[], number[]];
  camMul: [number, number, number, number];
  preMul: [number, number, number, number];
  blackLevel: number;
  dataMaximum: number;
  whiteLevel: number;
}

export interface LensInfoSnapshot {
  lensName?: string;
  lensMake?: string;
  lensSerial?: string;
  internalLensSerial?: string;
  minFocal?: number;
  maxFocal?: number;
  maxAp4MinFocal?: number;
  maxAp4MaxFocal?: number;
  exifMaxAp?: number;
  focalLengthIn35mmFormat?: number;
}

export interface ColorInfoSnapshot {
  colors: number;
  filters: number;
  blackLevel: number;
  dataMaximum: number;
  whiteLevel: number;
  profileLength?: number;
  rgbCam: [number[], number[], number[]];
  camMul: [number, number, number, number];
}

export interface OutputParamsSnapshot {
  greybox: [number, number, number, number];
  cropbox: [number, number, number, number];
  aber: [number, number, number, number];
  gamma: [number, number, number, number, number, number];
  user_mul: [number, number, number, number];
  bright: number;
  threshold: number;
  half_size: boolean;
  four_color_rgb: boolean;
  highlight: number;
  use_auto_wb: boolean;
  use_camera_wb: boolean;
  use_camera_matrix: number;
  output_color: number;
  output_bps: number;
  output_tiff: boolean;
  output_flags: number;
  user_flip: number;
  user_qual: number;
  user_black: number;
  user_cblack: [number, number, number, number];
  user_sat: number;
  med_passes: number;
  auto_bright_thr: number;
  adjust_maximum_thr: number;
  no_auto_bright: boolean;
  use_fuji_rotate: boolean;
  use_p1_correction: boolean;
  green_matching: boolean;
  dcb_iterations: number;
  dcb_enhance_fl: boolean;
  fbdd_noiserd: number;
  exp_correc: boolean;
  exp_shift: number;
  exp_preser: number;
  no_auto_scale: boolean;
  no_interpolation: boolean;
  output_profile: string | null;
  camera_profile: string | null;
  bad_pixels: string | null;
  dark_frame: string | null;
}

export interface LibRawImageDataSnapshot {
  metadata: MetadataSnapshot;
  sizes: ImageSizeSnapshot;
  advanced: AdvancedMetadataSnapshot;
  lens: LensInfoSnapshot;
  color: ColorInfoSnapshot;
  params: OutputParamsSnapshot;
}
