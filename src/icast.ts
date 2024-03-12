import { MulticastV1 } from "./multicast_v1";
import { Dictionary } from "./dictionary";
import { Config } from "./config";
import { ICAST_DEFS, MULTICAST_DEFS, single_int8, single_uint8 } from "./utils";

class Icast {
  multicast: MulticastV1 = new MulticastV1();
  dictionary: Dictionary = new Dictionary();
  config: Config = new Config();

  async_recv_update: boolean = true;
  recv_update: boolean = false;
  recv_data_uint8: Uint8Array = single_uint8(0);

  constructor(async_recv_update: boolean = true) {
    this.async_recv_update = async_recv_update;
    this.multicast.set_recv_callback(this.callback_multicast_recv);
  }

  async init(path_to_cfg: string): Promise<Int8Array> {
    let ret: Int8Array = single_int8(ICAST_DEFS.SUCCESS);
    ret = await this.config.init(path_to_cfg);
    ret = await this.dictionary.init(
      this.config.agent,
      this.config.dictionary_path
    );
    ret = await this.multicast.init(
      this.config.multicast_ip,
      this.config.multicast_port,
      this.config.multicast_period_ms,
      this.config.multicast_interface
    );

    return ret;
  }

  update(): void {
    const rts: Int8Array = this.multicast.check_rts();

    if (rts[0] == MULTICAST_DEFS.RTS_TRUE) {
      const packet_to_send: Uint8Array =
        this.dictionary.packet_process_transmit();
      if (packet_to_send.length > 0) {
        this.multicast.send(Buffer.from(packet_to_send));
      }
    }

    if (this.async_recv_update) return;

    if (this.recv_update) {
      this.dictionary.packet_process_receive(this.recv_data_uint8);
      this.recv_update = false;
    }
  }

  callback_multicast_recv(data: any, sender: any): void {
    this.recv_data_uint8 = new Uint8Array(data);

    if (!this.async_recv_update) {
      this.recv_update = true;
      return;
    }

    this.dictionary.packet_process_receive(this.recv_data_uint8);
    return;
  }
}

export { Icast };
