import { read_json, single_int8, single_uint8 } from "./utils";

interface DictLevel3 {
  name: string;
  offset: Uint32Array;
  size: Uint32Array;
  type: string;
}

interface DictLevel2 {
  name: string;
  offset: Uint32Array;
  size: Uint32Array;
  values: DictLevel3[];
  isUpdatedLocal: boolean;
  isUpdatedRemote: boolean;
}

interface DictLevel1 {
  name: string;
  offset: Uint32Array;
  size: Uint32Array;
  fields: DictLevel2[];
}

class Dictionary {
  whoami: Int8Array = single_int8(99);
  path_to_dictionary: string = "99";

  dictionary_structure: DictLevel1[] = [];
  dictionary_data: Uint8Array = single_uint8(99);

  private callback_init: (ret: Int8Array) => void;

  constructor(callback_init: (ret: Int8Array) => void) {
    this.callback_init = callback_init;
  }

  init(whoami: Int8Array, path_to_dictionary: string): Int8Array {
    let ret: Int8Array = single_int8(0);

    // Verify id of whoami [0...128]
    if (whoami[0] < 0) {
      ret[0] = -1;
      return ret;
    }

    // Verify path_to_dictionary
    if (!path_to_dictionary.endsWith(".json")) {
      ret[0] = -1;
      return ret;
    }

    this.whoami = whoami;
    this.path_to_dictionary = path_to_dictionary;

    let json_data_buffer: any;

    read_json(
      this.path_to_dictionary,
      (data) => {
        json_data_buffer = JSON.parse(data);
        this.callback_init(single_int8(0));
      },
      (err) => {
        console.log(err);
        this.callback_init(single_int8(-1));
      }
    );

    return ret;
  }
}

export { Dictionary };
