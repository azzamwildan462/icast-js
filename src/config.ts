import {
  CONFIG_DEFS,
  read_json_blocking,
  single_int8,
  single_uint16,
} from "./utils";

class Config {
  agent: Int8Array = single_int8(0);
  dictionary_path: string = "";
  multicast_ip: string = "";
  multicast_port: Uint16Array = single_uint16(9999);
  multicast_interface: string = "";
  multicast_period_ms: Uint16Array = single_uint16(20);

  async init(path: string): Promise<Int8Array> {
    let ret: Int8Array = single_int8(CONFIG_DEFS.SUCCESS);

    let conf_buffer: any;
    conf_buffer = {} as any;
    await read_json_blocking(path, conf_buffer);

    this.agent[0] = conf_buffer.value["agent"];
    this.dictionary_path = conf_buffer.value["dictionary_path"];
    this.multicast_ip = conf_buffer.value["multicast_ip"];
    this.multicast_port[0] = conf_buffer.value["multicast_port"];
    this.multicast_interface = conf_buffer.value["multicast_interface"];
    this.multicast_period_ms[0] = conf_buffer.value["multicast_period_ms"];

    return ret;
  }

  print_configs(): void {
    console.log(this.agent[0]);
    console.log(this.dictionary_path);
    console.log(this.multicast_ip);
    console.log(this.multicast_port);
    console.log(this.multicast_interface);
    console.log(this.multicast_period_ms);
  }
}

export { Config };
