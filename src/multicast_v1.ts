import { Multicast } from "./multicast";
import {
  MULTICAST_DEFS,
  any_onj_t,
  single_int8,
  single_uint16,
  single_uint8,
  ip_addr_to_address,
  get_time_now_ms,
} from "./utils";
import * as dgram from "dgram";

interface Peer {
  ip: number;
  ts: number;
}

class MulticastV1 extends Multicast {
  ip: string = "";
  port: Uint16Array = single_uint16(0);
  sock: any;
  time_start: number = 0;
  sockaddr_in: any;
  iface_ip_addr: any_onj_t = {} as any;
  use_default_iface: boolean;
  netmask: Uint8Array = single_uint8(24);

  // TDMA
  tdma_my_ip: number = 0;
  tdma_my_id: Uint8Array = single_uint8(0);
  period_ms: Uint16Array = single_uint16(100);
  next_time_tx: number = 0;
  last_time_rx: number = 0;
  tdma_peers: Peer[] = [];

  //=================================================

  callback_on_recv: (data: any, sender: any) => void;

  //=================================================

  constructor(callback_on_recv: (data: any, sender: any) => void = () => {}) {
    super();

    this.callback_on_recv = callback_on_recv;

    this.time_start = new Date().getTime();
    this.use_default_iface = false;
  }

  //====================================================

  private async bindSync(loopback: boolean = false): Promise<void> {
    if (this.use_default_iface) this.sock.bind(this.port[0]);
    else this.sock.bind(this.port[0], this.iface_ip_addr.value);

    return new Promise((resolve) => {
      this.sock.on("listening", () => {
        this.sockaddr_in = this.sock.address();

        // Add socket to multicast membership, so he can recv packets
        this.sock.addMembership(this.ip);

        // Set multicast ttl
        this.sock.setMulticastTTL(1);

        // Disable loopback
        loopback == true
          ? this.sock.setMulticastLoopback(true)
          : this.sock.setMulticastLoopback(false);

        resolve();
      });
    });
  }

  //====================================================

  async init(
    ip: string,
    port: Uint16Array,
    period_ms: Uint16Array,
    nw_iface: string = "",
    loopback: boolean = false
  ): Promise<Int8Array> {
    let ret: Int8Array = single_int8(99);

    this.ip = ip;
    this.port = port;
    this.period_ms = period_ms;

    // Validate interface
    ret = this.find_interface_ip(nw_iface, this.iface_ip_addr);
    if (ret[0] == MULTICAST_DEFS.USE_DEFAULT_IFACE) {
      ret[0] = ret[0] & ~MULTICAST_DEFS.USE_DEFAULT_IFACE;
      this.use_default_iface = true;
    } else if (ret[0] != MULTICAST_DEFS.SUCCESS) {
      return ret;
    }

    // Convert to number
    this.tdma_my_ip = ip_addr_to_address(
      this.iface_ip_addr.value,
      this.netmask
    )[0];

    const time_now = this.get_wall_time_now_ms();
    this.next_time_tx = time_now;
    this.last_time_rx = time_now;

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

    this.sock.on("message", (data: any, sender: any) => {
      const ip_sender_num: number = ip_addr_to_address(sender.address)[0];

      this.routine_tdma(ip_sender_num);
      this.callback_tdma(ip_sender_num);

      this.callback_on_recv(data, ip_sender_num);
    });

    await this.bindSync(loopback);

    ret[0] = MULTICAST_DEFS.SUCCESS;
    return ret;
  }
  send(data: any): Int8Array {
    this.sock.send(data, 0, data.length, this.port[0], this.ip);
    return single_int8(0);
  }
  check_rts(): Int8Array {
    const time_now = this.get_wall_time_now_ms();

    if (time_now >= this.next_time_tx) {
      this.routine_tdma(this.tdma_my_ip);
      this.next_time_tx += this.period_ms[0];

      return single_int8(MULTICAST_DEFS.RTS_TRUE);
    }

    return single_int8(MULTICAST_DEFS.RTS_FALSE);
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

  set_recv_callback(callback_on_recv: (data: any, sender: any) => void): void {
    this.callback_on_recv = callback_on_recv;
  }

  set_netmask(netmask: Uint8Array): void {
    this.netmask = netmask;
  }

  routine_tdma(ip: number): void {
    const time_now = this.get_wall_time_now_ms();

    // Delete peer if timestamp is too old
    let idx: Uint8Array = single_uint8(0);
    for (const peer of this.tdma_peers) {
      if (time_now - peer.ts > 2000) {
        this.tdma_peers.splice(idx[0], 1);
        idx[0]--;
      }
      idx[0]++;
    }

    // Update ts if isset
    let if_exist: boolean = false;
    for (const peer of this.tdma_peers) {
      if (peer.ip == ip) {
        peer.ts = time_now;
        if_exist = true;
        break;
      }
    }

    if (!if_exist) {
      let peer: Peer;
      peer = {} as Peer;
      peer.ip = ip;
      peer.ts = time_now;
      this.tdma_peers.push(peer);

      // Sort based on ip addr
      this.tdma_peers.sort((a, b) => a.ip - b.ip);
    }

    // Update my id based on tdma_peer
    idx[0] = 0;
    for (const peer of this.tdma_peers) {
      if (peer.ip == this.tdma_my_ip) {
        this.tdma_my_id = idx;
        break;
      }
    }
  }

  callback_tdma(ip: number): void {
    this.last_time_rx = this.get_wall_time_now_ms();

    let tdma_peer_id: Uint8Array = single_uint8(0);
    let tdma_peer_delta_id: Int8Array = single_int8(0);

    // Search for peer id
    let idx: Uint8Array = single_uint8(0);
    for (const peer of this.tdma_peers) {
      if (peer.ip == ip) {
        tdma_peer_id = idx;
        break;
      }
      idx[0]++;
    }

    // Calculate steps
    if (this.tdma_my_id[0] > tdma_peer_id[0]) {
      tdma_peer_delta_id[0] = this.tdma_my_id[0] - tdma_peer_id[0];
    } else {
      tdma_peer_delta_id[0] =
        this.tdma_my_id[0] - tdma_peer_id[0] + this.tdma_peers.length;
    }

    // Calculate nest time tx
    this.next_time_tx =
      this.last_time_rx +
      (this.period_ms[0] * tdma_peer_delta_id[0]) / this.tdma_peers.length;
  }
}

export { MulticastV1 };
