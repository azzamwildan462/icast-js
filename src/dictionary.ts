import {
  DICTIONARY_DEFS,
  any_onj_t,
  offset_size_t,
  read_json_blocking,
  single_int8,
  single_uint8,
  single_uint32,
  dict_types_to_size,
  memcpy,
  memset,
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
    memset(this.dictionary_data, 0, dictionary_data_size);

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

  get_offset_size(id: Int8Array, key: string): offset_size_t {
    let key_level1: string;
    key_level1 = "agent" + String(id[0]);

    let offset_size: offset_size_t;
    offset_size = {} as offset_size_t;
    offset_size.size = single_uint32(0);
    offset_size.offset = single_uint32(0);

    //===============================

    // Using only agent id
    if (key == "") {
      for (const dict_leve1 of this.dictionary_structure) {
        if (key_level1 == dict_leve1.name) {
          offset_size.offset = dict_leve1.offset;
          offset_size.size = dict_leve1.size;
          break;
        }
      }
      return offset_size;
    }

    //================================

    const key_parts = key.split("/");

    // Using "vel/x"
    if (key_parts.length > 1) {
      for (const dict_level1 of this.dictionary_structure) {
        if (key_level1 == dict_level1.name) {
          for (const dict_level2 of dict_level1.fields) {
            if (dict_level2.name == key_parts[0]) {
              for (const dict_level3 of dict_level2.values) {
                if (dict_level3.name == key_parts[1]) {
                  offset_size.offset = dict_level3.offset;
                  offset_size.size = dict_level3.size;
                  return offset_size;
                }
              }
            }
          }
        }
      }

      return offset_size;
    }

    //================================

    // Using only "vel"
    else {
      for (const dict_level1 of this.dictionary_structure) {
        if (key_level1 == dict_level1.name) {
          for (const dict_level2 of dict_level1.fields) {
            if (dict_level2.name == key) {
              offset_size.offset = dict_level2.offset;
              offset_size.size = dict_level2.size;
              return offset_size;
            }
          }
        }
      }
    }
    return offset_size;
  }

  assign_my_data_to_bus(key: string, data: Uint8Array): void {
    const offset_size = this.get_offset_size(this.whoami, key);

    memcpy(
      this.dictionary_data,
      data,
      offset_size.size[0],
      offset_size.offset[0]
    );

    this.set_reset_update(this.whoami, key, false, true);
  }

  get_data_from_bus(id: Int8Array, key: string): Uint8Array {
    let data_ret: Uint8Array;
    data_ret = {} as Uint8Array;

    const offset_size = this.get_offset_size(id, key);

    data_ret = new Uint8Array(offset_size.size[0]);
    memset(data_ret, 0, offset_size.size[0]);
    memcpy(
      data_ret,
      this.dictionary_data,
      offset_size.size[0],
      0,
      offset_size.offset[0]
    );

    return data_ret;
  }

  assign_data_to_bus(id: Int8Array, key: string, data: Uint8Array): void {
    const offset_size = this.get_offset_size(id, key);

    memcpy(
      this.dictionary_data,
      data,
      offset_size.size[0],
      offset_size.offset[0]
    );

    this.set_reset_update(id, key, true, true);
  }

  set_reset_update(
    id: Int8Array,
    key: string,
    local_remote: boolean,
    set_reset: boolean
  ): void {
    let key_level1: string;
    key_level1 = "agent" + String(id[0]);

    //===============================

    // Using only agent id
    if (key == "") {
      for (const dict_leve11 of this.dictionary_structure) {
        if (key_level1 == dict_leve11.name) {
          for (const dict_level2 of dict_leve11.fields) {
            if (!local_remote) dict_level2.isUpdatedLocal = set_reset;
            else dict_level2.isUpdatedRemote = set_reset;
          }
          break;
        }
      }
      return;
    }

    const key_parts = key.split("/");

    if (key_level1.length > 1) key = key_parts[0];

    for (const dict_leve11 of this.dictionary_structure) {
      if (key_level1 == dict_leve11.name) {
        for (const dict_level2 of dict_leve11.fields) {
          if (dict_level2.name == key) {
            if (!local_remote) dict_level2.isUpdatedLocal = set_reset;
            else dict_level2.isUpdatedRemote = set_reset;
          }
        }
        break;
      }
    }

    return;
  }

  packet_add(
    packet: Uint8Array,
    offset: Uint32Array,
    size: Uint32Array
  ): Uint8Array {
    let curr_packet_lenght: number = packet.length;
    let packet_buffer: Uint8Array = new Uint8Array(curr_packet_lenght);
    memcpy(packet_buffer, packet, curr_packet_lenght, 0, 0);

    packet = new Uint8Array(curr_packet_lenght + 4 + size[0]);
    packet[curr_packet_lenght] = offset[0] & 0xff;
    packet[curr_packet_lenght + 1] = offset[0] >> 8;
    packet[curr_packet_lenght + 2] = size[0] & 0xff;
    packet[curr_packet_lenght + 3] = size[0] >> 8;

    memcpy(packet, packet_buffer, curr_packet_lenght, 0, 0);

    memcpy(
      packet,
      this.dictionary_data,
      size[0],
      curr_packet_lenght + 4,
      offset[0]
    );

    return packet;
  }

  packet_process_transmit(): Uint8Array {
    const key_level1: string = "agent" + String(this.whoami[0]);

    // Reset packet to be sent
    let packet: Uint8Array = new Uint8Array(0);

    // So it will filter what the data that updated, every each data that update, it will be sent
    for (const level1 of this.dictionary_structure) {
      if (level1.name == key_level1) {
        for (const level2 of level1.fields) {
          if (level2.isUpdatedLocal) {
            packet = this.packet_add(packet, level2.offset, level2.size);
            level2.isUpdatedLocal = false;
          }
        }
        break;
      }
    }

    return packet;
  }

  packet_process_receive(packet: Uint8Array): void {
    for (let it = 0; it < packet.length; ) {
      // Get offset and size
      const offset: Uint32Array = single_uint32(
        packet[it] | (packet[it + 1] << 0x08)
      );
      const size: Uint32Array = single_uint32(
        packet[it + 2] | (packet[it + 3] << 0x08)
      );
      it += 4;

      // COpy to data bus
      memcpy(this.dictionary_data, packet, size[0], offset[0], it);

      it += size[0];

      // Update state
      for (const level1 of this.dictionary_structure) {
        for (const level2 of level1.fields) {
          if (level2.offset[0] == offset[0]) {
            level2.isUpdatedRemote = true;
          }
        }
      }
    }
  }
}

export { Dictionary };
