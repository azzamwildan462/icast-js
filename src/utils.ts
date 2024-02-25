import * as fs from "fs";

function memcpy(
  destination: Uint8Array,
  source: Uint8Array,
  length: number,
  offsetDest: number = 0,
  offsetSrc: number = 0
): void {
  for (let i = 0; i < length; i++) {
    destination[offsetDest + i] = source[offsetSrc + i];
  }
}

function memset(
  target: Uint8Array,
  value: number,
  length: number,
  offset: number = 0
): void {
  for (let i = offset; i < offset + length; i++) {
    target[i] = value;
  }
}

function single_uint8(default_value: number): Uint8Array {
  const ret = new Uint8Array([default_value]);
  return ret;
}

function single_int8(default_value: number = 0): Int8Array {
  const ret = new Int8Array([default_value]);
  return ret;
}

function single_uint16(default_value: number = 0): Uint16Array {
  const ret = new Uint16Array([default_value]);
  return ret;
}

function get_time_now_ms(): number {
  return new Date().getTime();
}

function read_json(
  path_to_json: string,
  cllbck_success: (data: any) => void,
  cllbck_err: (err: any) => void
): void {
  fs.promises
    .readFile(path_to_json, "utf-8")
    .then(cllbck_success)
    .catch(cllbck_err);
}

export {
  memset,
  memcpy,
  single_int8,
  single_uint8,
  single_uint16,
  get_time_now_ms,
  read_json,
};
