import * as fs from "fs";

enum MULTICAST_DEFS {
  ADDRESS_PROHIBITED = -1,
  SUCCESS = 0,
}

enum DICTIONARY_DEFS {
  EMPTY_DICTIONARY = -3,
  INVALID_DICTIONARY_PATH = -2,
  INVALID_ID = -1,
  SUCCESS = 0,
}

//=============================================================

interface any_onj_t {
  value: any;
}

//==============================================================

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

function single_uint32(default_value: number = 0): Uint32Array {
  const ret = new Uint32Array([default_value]);
  return ret;
}

function get_time_now_ms(): number {
  return new Date().getTime();
}

async function read_json_blocking(
  path_to_string: string,
  ret_obj_ptr: any_onj_t
): Promise<void> {
  return fs.promises
    .readFile(path_to_string, "utf-8")
    .then((json_data) => {
      ret_obj_ptr.value = JSON.parse(json_data);
    })
    .catch((err) => {
      ret_obj_ptr.value = "";
    });
}

function dict_types_to_size(input_str: string): Uint32Array {
  const regex = /(int|uint|float)(\d+)(?:\[(\d+)\])?/;

  const match = input_str.match(regex);
  let ret_size: number = 0;

  if (match) {
    ret_size = Number(match[2]);
    if (match[3] != undefined) ret_size = Number(match[2]) * Number(match[3]);
  }

  return single_uint32(ret_size);
}

export {
  MULTICAST_DEFS,
  DICTIONARY_DEFS,
  any_onj_t,
  memset,
  memcpy,
  single_int8,
  single_uint8,
  single_uint16,
  single_uint32,
  get_time_now_ms,
  read_json_blocking,
  dict_types_to_size,
};
