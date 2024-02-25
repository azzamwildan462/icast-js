import { stringify } from "ts-jest";
import { Dictionary } from "../src/dictionary";
import {
  DICTIONARY_DEFS,
  offset_size_t,
  single_int8,
  single_uint32,
  single_uint8,
} from "../src/utils";

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

    dictionary.get_offset_size(single_int8(1), "", offset_size);
    expect(offset_size.offset).toEqual(single_uint32(23));
    expect(offset_size.size).toEqual(single_uint32(682));

    dictionary.get_offset_size(single_int8(2), "vel", offset_size);
    expect(offset_size.offset).toEqual(single_uint32(717));
    expect(offset_size.size).toEqual(single_uint32(12));

    dictionary.get_offset_size(single_int8(3), "ball/x", offset_size);
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
