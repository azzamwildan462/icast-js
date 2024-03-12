import { Icast } from "../src/icast";
import { ICAST_DEFS, delay, single_int8 } from "../src/utils";

interface point_t {
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
}
function set_data_uint8(): Uint8Array {
  let velocity: point_t;
  velocity = {} as point_t;
  velocity.x = new Float32Array([23.9]);
  velocity.y = new Float32Array([100.9]);
  velocity.z = new Float32Array([-99.9]);

  const buffer = new ArrayBuffer(12);
  const data_view = new DataView(buffer);

  data_view.setFloat32(0, velocity.x[0], true);
  data_view.setFloat32(4, velocity.y[0], true);
  data_view.setFloat32(8, velocity.z[0], true);

  return new Uint8Array(buffer);
}

describe("Basic Icast", () => {
  it("should init successfully", async () => {
    const icast = new Icast();

    await expect(
      icast.init("/home/wildan/proyek/icast-js/icast.json")
    ).resolves.toEqual(single_int8(ICAST_DEFS.SUCCESS));
  });

  it("should periodically activate rts based on icast.json", async () => {
    const icast = new Icast();

    await icast.init("/home/wildan/proyek/icast-js/icast.json");

    const send_spy = jest.spyOn(icast.multicast, "send");

    const period = icast.config.multicast_period_ms[0];
    const runtime = 1000; // adjust it
    const expected_has_been_called = Math.floor(runtime / period);

    const use_case1 = setInterval(() => {
      icast.update();
    }, 20);

    await delay(runtime);
    clearInterval(use_case1);

    expect(send_spy).toHaveBeenCalledTimes(0); // 0 because is not set any data

    const use_case2 = setInterval(() => {
      const uint8_data: Uint8Array = set_data_uint8();
      icast.dictionary.assign_my_data_to_bus("vel", uint8_data);
      icast.update();
    }, 20);

    await delay(runtime);
    clearInterval(use_case2);

    expect(send_spy).toHaveBeenCalledTimes(expected_has_been_called); // 0 because is not set any data
  }, 10000);

  it("should update next time tx while recvd some data from multicast", async () => {
    const icast = new Icast();
    await icast.init("/home/wildan/proyek/icast-js/icast.json");

    const send_spy = jest.spyOn(icast.multicast.sock, "send");

    const uint8_data: Uint8Array = set_data_uint8();
    icast.dictionary.assign_my_data_to_bus("vel", uint8_data);
    icast.update();

    console.log(icast.multicast.next_time_tx);

    const data_sent = send_spy.mock.calls[0][0];

    icast.multicast.sock.emit("message", data_sent, {
      address: "192.168.123.100",
      port: 12345,
    });

    console.log(icast.multicast.next_time_tx);
  });
});
