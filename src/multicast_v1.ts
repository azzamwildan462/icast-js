import { Multicast } from "./multicast";
import { MULTICAST_DEFS, single_int8, single_uint16 } from "./utils";
import * as dgram from "dgram";

class MulticastV1 extends Multicast {
  ip: string = "";
  port: Uint16Array = single_uint16(0);
  sock: any;
  iface_ip_addr: any;
  time_start: number = 0;
  sockaddr_in: any;
  use_default_iface: boolean;

  //=================================================

  callback_on_recv: (data: any, sender: any) => void;

  //=================================================

  constructor(callback_on_recv: (data: any, sender: any) => void) {
    super();
    this.callback_on_recv = callback_on_recv;

    this.time_start = new Date().getTime();
    this.use_default_iface = false;
  }

  //====================================================

  private async bindSync(): Promise<void> {
    if (this.use_default_iface) this.sock.bind(this.port[0]);
    else this.sock.bind(this.port[0], this.iface_ip_addr);

    return new Promise((resolve) => {
      this.sock.on("listening", () => {
        this.sockaddr_in = this.sock.address();

        // Add socket to multicast membership, so he can recv packets
        this.sock.addMembership(this.ip);

        // Set multicast ttl
        this.sock.setMulticastTTL(128);

        resolve();
      });
    });
  }

  //====================================================

  async init(
    ip: string,
    port: Uint16Array,
    nw_iface: string = ""
  ): Promise<Int8Array> {
    let ret: Int8Array = single_int8(99);

    this.ip = ip;
    this.port = port;

    // Validate interface
    ret = this.find_interface_ip(nw_iface, this.iface_ip_addr);
    if (ret[0] == MULTICAST_DEFS.USE_DEFAULT_IFACE) {
      ret[0] = ret[0] & ~MULTICAST_DEFS.USE_DEFAULT_IFACE;
      this.use_default_iface = true;
    } else if (ret[0] != MULTICAST_DEFS.SUCCESS) {
      return ret;
    }

    // Validate multicast addr
    ret = this.validate_multicast_addr(this.ip);
    if (ret[0] != MULTICAST_DEFS.SUCCESS) {
      return ret;
    }

    // Create udp socket using ipv4
    this.sock = dgram.createSocket({ type: "udp4", reuseAddr: true });

    // This will called if any error detected
    this.sock.on("error", (err: any) => {
      console.error(`Socket error: ${err.message}`);
    });

    this.sock.on("message", this.callback_on_recv);

    await this.bindSync();

    ret[0] = MULTICAST_DEFS.SUCCESS;
    return ret;
  }
  send(data: any): Int8Array {
    this.sock.send(data, 0, data.length, this.port[0], this.ip);
    return single_int8(0);
  }
  check_rts(): Int8Array {
    return single_int8(0);
  }
  close(): Int8Array {
    this.sock.close();
    return single_int8(0);
  }

  //====================================================

  get_wall_time_now_ms(): number {
    const time_now = new Date().getTime();
    return time_now - this.time_start;
  }
}

export { MulticastV1 };
