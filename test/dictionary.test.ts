import { stringify } from "ts-jest";
import { Dictionary } from "../src/dictionary";
import {
  DICTIONARY_DEFS,
  offset_size_t,
  single_int8,
  single_uint32,
  single_uint8,
} from "../src/utils";
import { convertToObject } from "typescript";

describe("Basic dictionary", () => {
  it("should error if did not use valid json filepath", async () => {
    const dictionary = new Dictionary();

    await expect(
      dictionary.init(single_int8(1), "/home/wildan/proyek/icast-js/")
    ).resolves.toEqual(single_int8(DICTIONARY_DEFS.INVALID_DICTIONARY_PATH));
  });

  it("should error if id of whoami not supported", async () => {
    const dictionary = new Dictionary();

    await expect(
      dictionary.init(single_int8(-1), "/home/wildan/proyek/icast-js/")
    ).resolves.toEqual(single_int8(DICTIONARY_DEFS.INVALID_ID));
  });

  it("should read and parse JSON", async () => {
    const dictionary = new Dictionary();

    await expect(
      dictionary.init(
        single_int8(1),
        "/home/wildan/proyek/icast-js/dictionary.json"
      )
    ).resolves.toEqual(single_int8(DICTIONARY_DEFS.SUCCESS));
  });

  it("should error when JSON is empty", async () => {
    const dictionary = new Dictionary();

    await expect(
      dictionary.init(single_int8(1), "/home/wildan/proyek/icast-js/hello.json")
    ).resolves.toEqual(single_int8(DICTIONARY_DEFS.EMPTY_DICTIONARY));
  });

  it("should have a valid structure", async () => {
    const dictionary = new Dictionary();

    await dictionary.init(
      single_int8(1),
      "/home/wildan/proyek/icast-js/dictionary.json"
    );

    let offset_size: offset_size_t;
    offset_size = {} as offset_size_t;

    offset_size = dictionary.get_offset_size(single_int8(1), "");
    expect(offset_size.offset).toEqual(single_uint32(23));
    expect(offset_size.size).toEqual(single_uint32(682));

    offset_size = dictionary.get_offset_size(single_int8(2), "vel");
    expect(offset_size.offset).toEqual(single_uint32(717));
    expect(offset_size.size).toEqual(single_uint32(12));

    offset_size = dictionary.get_offset_size(single_int8(3), "ball/x");
    expect(offset_size.offset).toEqual(single_uint32(1413));
    expect(offset_size.size).toEqual(single_uint32(20));
  });

  it("should've a method to write or read data though data_bus", async () => {
    const dictionary = new Dictionary();

    await dictionary.init(
      single_int8(2),
      "/home/wildan/proyek/icast-js/dictionary.json"
    );

    interface ball_t {
      is_caught: Uint8Array;
      is_visible: Uint8Array;
      x: Float32Array;
      y: Float32Array;
      vx: Float32Array;
      vy: Float32Array;
    }

    let ball: ball_t;
    ball = {} as ball_t;
    ball.is_caught = single_uint8(12);
    ball.is_visible = single_uint8(1);
    ball.x = new Float32Array([12.12, 23.23, 0, 0, 0]);
    ball.y = new Float32Array([23.12, 23.23, 0, 0, 0]);
    ball.vx = new Float32Array([100.2, 45.67, 0, 0, 0]);
    ball.vy = new Float32Array([200.0, 400.69, 0, 0, 321.123]);

    const buffer = new ArrayBuffer(82);
    const data_view = new DataView(buffer);

    data_view.setUint8(0, ball.is_caught[0]);
    data_view.setUint8(1, ball.is_visible[0]);

    for (let it = 0; it < 5; it++) {
      data_view.setFloat32(2 + it * 4, ball.x[it], true);
      data_view.setFloat32(22 + it * 4, ball.y[it], true);
      data_view.setFloat32(42 + it * 4, ball.vx[it], true);
      data_view.setFloat32(62 + it * 4, ball.vy[it], true);
    }

    const data_uint8_arr = new Uint8Array(buffer);

    dictionary.assign_my_data_to_bus("ball", data_uint8_arr);

    const get_data_from_bus = dictionary.get_data_from_bus(
      single_int8(2),
      "ball"
    );

    const data_view_get = new DataView(get_data_from_bus.buffer);
    const ball_is_caught: number = data_view_get.getUint8(0);
    const ball_is_visible: number = data_view_get.getUint8(1);
    const first_float: number = data_view_get.getFloat32(2, true);
    const last_vy: number = data_view_get.getFloat32(78, true);

    expect(ball_is_caught).toEqual(ball.is_caught[0]);
    expect(ball_is_visible).toEqual(ball.is_visible[0]);
    expect(first_float).toEqual(ball.x[0]);
    expect(last_vy).toEqual(ball.vy[4]);

    expect(get_data_from_bus).toEqual(data_uint8_arr);
  });
});

describe("Dictionary data flow", () => {
  it("should automatically process updated package from my data (1)", async () => {
    const dictionary = new Dictionary();

    await dictionary.init(
      single_int8(2),
      "/home/wildan/proyek/icast-js/dictionary.json"
    );

    interface point_t {
      x: Float32Array;
      y: Float32Array;
      z: Float32Array;
    }

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

    const uint8_data = new Uint8Array(buffer);

    dictionary.assign_my_data_to_bus("vel", uint8_data);

    const packet_to_be_sent = dictionary.packet_process_transmit();

    const data_view2 = new DataView(packet_to_be_sent.buffer);
    const offset: number =
      packet_to_be_sent[0] | (packet_to_be_sent[1] << 0x08);
    const size: number = packet_to_be_sent[2] | (packet_to_be_sent[3] << 0x08);
    const vel_x = data_view2.getFloat32(4, true);
    const vel_y = data_view2.getFloat32(8, true);
    const vel_z = data_view2.getFloat32(12, true);

    const offset_size = dictionary.get_offset_size(dictionary.whoami, "vel");

    expect(offset).toEqual(offset_size.offset[0]);
    expect(size).toEqual(offset_size.size[0]);

    expect(vel_x).toEqual(velocity.x[0]);
    expect(vel_y).toEqual(velocity.y[0]);
    expect(vel_z).toEqual(velocity.z[0]);
  });

  it("should automatically process updated package from my data (2)", async () => {
    const dictionary = new Dictionary();

    await dictionary.init(
      single_int8(2),
      "/home/wildan/proyek/icast-js/dictionary.json"
    );

    interface point_t {
      x: Float32Array;
      y: Float32Array;
      z: Float32Array;
    }

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

    const uint8_data = new Uint8Array(buffer);

    dictionary.assign_my_data_to_bus("vel", uint8_data);
    dictionary.assign_my_data_to_bus("pos", uint8_data); // Seakan akan ini ada baru

    const packet_to_be_sent = dictionary.packet_process_transmit();

    const data_view2 = new DataView(packet_to_be_sent.buffer);
    const offset: number =
      packet_to_be_sent[0] | (packet_to_be_sent[1] << 0x08);
    const size: number = packet_to_be_sent[2] | (packet_to_be_sent[3] << 0x08);
    const vel_x = data_view2.getFloat32(4, true);
    const vel_y = data_view2.getFloat32(8, true);
    const vel_z = data_view2.getFloat32(12, true);

    // Seakan akan ini data tambahan
    const offset_2: number =
      packet_to_be_sent[16 + 0] | (packet_to_be_sent[16 + 1] << 0x08);
    const size_2: number =
      packet_to_be_sent[16 + 2] | (packet_to_be_sent[16 + 3] << 0x08);
    const vel_x_2 = data_view2.getFloat32(16 + 4, true);
    const vel_y_2 = data_view2.getFloat32(16 + 8, true);
    const vel_z_2 = data_view2.getFloat32(16 + 12, true);

    let offset_size: offset_size_t;
    offset_size = {} as offset_size_t;

    offset_size = dictionary.get_offset_size(dictionary.whoami, "pos");
    expect(offset).toEqual(offset_size.offset[0]);
    expect(size).toEqual(offset_size.size[0]);
    expect(vel_x).toEqual(velocity.x[0]);
    expect(vel_y).toEqual(velocity.y[0]);
    expect(vel_z).toEqual(velocity.z[0]);

    offset_size = dictionary.get_offset_size(dictionary.whoami, "vel");
    expect(offset_2).toEqual(offset_size.offset[0]);
    expect(size_2).toEqual(offset_size.size[0]);
    expect(vel_x_2).toEqual(velocity.x[0]);
    expect(vel_y_2).toEqual(velocity.y[0]);
    expect(vel_z_2).toEqual(velocity.z[0]);
  });

  it("should process packet that received", async () => {
    const dictionary = new Dictionary();
    const dictionary2 = new Dictionary();

    await dictionary.init(
      single_int8(2),
      "/home/wildan/proyek/icast-js/dictionary.json"
    );

    await dictionary2.init(
      single_int8(1),
      "/home/wildan/proyek/icast-js/dictionary.json"
    );

    interface point_t {
      x: Float32Array;
      y: Float32Array;
      z: Float32Array;
    }

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

    const uint8_data = new Uint8Array(buffer);

    dictionary.assign_my_data_to_bus("vel", uint8_data);

    // SIMULATE SEND AND RECV HERE
    const packet_to_be_sent = dictionary.packet_process_transmit();
    dictionary2.packet_process_receive(packet_to_be_sent);
    const data_from_bus = dictionary2.get_data_from_bus(single_int8(2), "vel");

    const data_view2 = new DataView(data_from_bus.buffer);
    const vel_x = data_view2.getFloat32(0, true);
    const vel_y = data_view2.getFloat32(4, true);
    const vel_z = data_view2.getFloat32(8, true);

    expect(vel_x).toEqual(velocity.x[0]);
    expect(vel_y).toEqual(velocity.y[0]);
    expect(vel_z).toEqual(velocity.z[0]);
  });
});
