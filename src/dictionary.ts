import {
  DICTIONARY_DEFS,
  any_onj_t,
  read_json_blocking,
  single_int8,
  single_uint8,
  single_uint32,
  dict_types_to_size,
} from "./utils";

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

  async init(
    whoami: Int8Array,
    path_to_dictionary: string
  ): Promise<Int8Array> {
    let ret: Int8Array = single_int8(0);

    // Verify id of whoami [0...128]
    if (whoami[0] < 0) {
      ret[0] = DICTIONARY_DEFS.INVALID_ID;
      return ret;
    }

    // Verify path_to_dictionary
    if (!path_to_dictionary.endsWith(".json")) {
      ret[0] = DICTIONARY_DEFS.INVALID_DICTIONARY_PATH;
      return ret;
    }

    this.whoami = whoami;
    this.path_to_dictionary = path_to_dictionary;

    const json_data: any_onj_t = { value: "" };
    await read_json_blocking(this.path_to_dictionary, json_data);

    // Validate json data
    if (json_data.value == "") {
      ret[0] = DICTIONARY_DEFS.EMPTY_DICTIONARY;
      return ret;
    }

    //================== data process ==================
    let dictionary_data_size: number = 0;
    for (const level1 in json_data.value) {
      let dict_level1: DictLevel1;
      dict_level1 = {} as DictLevel1;
      dict_level1.name = level1;
      dict_level1.offset = single_uint32(dictionary_data_size);
      dict_level1.size = single_uint32(0);
      dict_level1.fields = [];

      //========
      for (const level2 in json_data.value[level1]) {
        let dict_level2: DictLevel2;
        dict_level2 = {} as DictLevel2;
        dict_level2.name = level2;
        dict_level2.offset = single_uint32(dictionary_data_size);
        dict_level2.size = single_uint32(0);
        dict_level2.isUpdatedLocal = false;
        dict_level2.isUpdatedRemote = false;
        dict_level2.values = [];

        //==========
        for (const level3 in json_data.value[level1][level2]) {
          let dict_level3: DictLevel3;
          dict_level3 = {} as DictLevel3;
          dict_level3.name = level3;
          dict_level3.type = json_data.value[level1][level2][level3];
          dict_level3.offset = single_uint32(dictionary_data_size);

          dict_level3.size = dict_types_to_size(dict_level3.type);

          dictionary_data_size += dict_level3.size[0];

          dict_level2.size[0] += dict_level3.size[0];
          dict_level2.values.push(dict_level3);
        }
        //=========

        dict_level1.size[0] += dict_level2.size[0];
        dict_level1.fields.push(dict_level2);
      }

      this.dictionary_structure.push(dict_level1);
    }

    this.dictionary_data = new Uint8Array(dictionary_data_size);

    ret[0] = DICTIONARY_DEFS.SUCCESS;
    return ret;
  }

  print_structure(): void {
    this.dictionary_structure.forEach((dict_level_1, idx) => {
      console.log(
        dict_level_1.name,
        " ",
        dict_level_1.offset[0],
        " ",
        dict_level_1.size[0]
      );

      dict_level_1.fields.forEach((dict_level_2, idx) => {
        console.log(
          dict_level_2.name,
          " ",
          dict_level_2.offset[0],
          " ",
          dict_level_2.size[0]
        );

        dict_level_2.values.forEach((dict_level_3, idx) => {
          console.log(
            dict_level_3.name,
            " ",
            dict_level_3.offset[0],
            " ",
            dict_level_3.size[0]
          );
        });
      });
    });
  }
}

export { Dictionary };
