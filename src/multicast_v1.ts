import { Multicast } from "./multicast";
import { single_int8, single_uint16 } from "./utils";
import * as dgram from "dgram";

class MulticastV1 extends Multicast {
  ip: string = "";
  port: Uint16Array = single_uint16(0);
  sock: any;
  time_start: number = 0;
  sockaddr_in: any;

  //=================================================

  private callback_init: (ret: Int8Array) => void;
  callback_on_recv: (data: any, sender: any) => void;

  //=================================================

  constructor(
    callback_init: (ret: Int8Array) => void,
    callback_on_recv: (data: any, sender: any) => void
  ) {
    super();
    this.callback_init = callback_init;
    this.callback_on_recv = callback_on_recv;

    this.time_start = new Date().getTime();
  }

  //====================================================

  init(ip: string, port: Uint16Array): Int8Array {
    let ret: Int8Array = single_int8(99);

    this.ip = ip;
    this.port = port;

    // Validate multicast addr
    ret = this.validate_multicast_addr(this.ip);
    if (ret[0] != 0) {
      this.callback_init(ret);
      return ret;
    }

    // Create udp socket using ipv4
    this.sock = dgram.createSocket({ type: "udp4", reuseAddr: true });

    // This will called if any error detected
    this.sock.on("error", (err: any) => {
      console.error(`Socket error: ${err.message}`);
    });

    // This callback is called once
    this.sock.on("listening", () => {
      this.sockaddr_in = this.sock.address();

      // Add socket to multicast membership, so he can recv packets
      this.sock.addMembership(this.ip);

      // Set multicast ttl
      this.sock.setMulticastTTL(128);

      ret[0] = 0;
      this.callback_init(ret);
    });

    this.sock.on("message", this.callback_on_recv);

    this.sock.bind(this.port[0]);

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
