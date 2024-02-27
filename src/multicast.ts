import { single_int8 } from "./utils";
import * as os from "os";
import { MULTICAST_DEFS } from "./utils";

class Multicast {
  async init(
    ip: string,
    port: Uint16Array,
    nw_iface: string
  ): Promise<Int8Array> {
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
      return single_int8(MULTICAST_DEFS.ADDRESS_PROHIBITED);
    }

    return single_int8(MULTICAST_DEFS.SUCCESS);
  }

  find_interface_ip(nw_iface: string, ip_addr_ptr: any): Int8Array {
    let ret: Int8Array = single_int8(MULTICAST_DEFS.SUCCESS);

    if (nw_iface == "") {
      ret[0] = MULTICAST_DEFS.USE_DEFAULT_IFACE;
      return ret;
    } else if (nw_iface == "lo") {
      ret[0] = MULTICAST_DEFS.PROHIBITED_INTERFACE;
      return ret;
    }

    const nw_iface_os = os.networkInterfaces()[nw_iface];
    if (!nw_iface_os) {
      ret[0] = MULTICAST_DEFS.INTERFACE_NOT_FOUND;
      return ret;
    }

    const ip_addr = nw_iface_os.find(
      (iface) => iface.family === "IPv4"
    )?.address;
    if (!ip_addr) {
      ret[0] = MULTICAST_DEFS.INTERFACE_NOT_CONNECTED_TO_NETWORK;
      return ret;
    }

    ip_addr_ptr = ip_addr;

    return ret;
  }
}

export { Multicast };
