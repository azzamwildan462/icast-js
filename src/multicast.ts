import { single_int8 } from "./utils";

class Multicast {
  async init(ip: string, port: Uint16Array): Promise<Int8Array> {
    return single_int8(99);
  }
  send(data: any): Int8Array {
    return single_int8(99);
  }
  check_rts(): Int8Array {
    return single_int8(99);
  }
  close(): Int8Array {
    return single_int8(99);
  }

  get_wall_time_now_ms(): number {
    return 99;
  }

  validate_multicast_addr(address: string): Int8Array {
    const multicastPattern = /^224\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

    if (!multicastPattern.test(address)) {
      return single_int8(-1);
    }

    return single_int8(0);
  }
}

export { Multicast };
