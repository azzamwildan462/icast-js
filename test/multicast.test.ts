import { MulticastV1 } from "../src/multicast_v1";
import {
  MULTICAST_DEFS,
  get_time_now_ms,
  single_int8,
  single_uint16,
} from "../src/utils";

const m_ip = "224.16.32.10";
const m_port = 6475;

describe("Multicast Class structure", () => {
  it("should have a structure from multicast abstract", async () => {
    const mock_callback_on_recv = jest.fn();
    const multicastV1 = new MulticastV1(mock_callback_on_recv);

    await expect(
      multicastV1.init(m_ip, single_uint16(m_port))
    ).resolves.not.toEqual(single_int8(99));
    expect(multicastV1.send("irisits")).not.toEqual(single_int8(99));
    expect(multicastV1.close()).not.toEqual(single_int8(99));
    expect(multicastV1.check_rts()).not.toEqual(single_int8(99));
    expect(multicastV1.get_wall_time_now_ms()).not.toEqual(99);
  });
});

describe("Multicast basic", () => {
  it("should init with zero return", async () => {
    const mock_callback_on_recv = jest.fn();
    const multicastV1 = new MulticastV1(mock_callback_on_recv);

    await expect(
      multicastV1.init(m_ip, single_uint16(m_port))
    ).resolves.toEqual(single_int8(MULTICAST_DEFS.SUCCESS));
  });
  it("should have a valid wall timer", (done) => {
    const mock_callback_on_recv = jest.fn();
    const multicastV1 = new MulticastV1(mock_callback_on_recv);
    const time_start = get_time_now_ms();

    setTimeout(() => {
      const time_now = get_time_now_ms();
      const dt = time_now - time_start;
      const error_time = dt - multicastV1.get_wall_time_now_ms();

      expect(Math.abs(error_time)).toBeLessThan(0.15);
      done();
    }, 100);
  });
  it("should close the socket", async () => {
    const mock_callback_on_recv = jest.fn();
    const multicastV1 = new MulticastV1(mock_callback_on_recv);

    await multicastV1.init(m_ip, single_uint16(m_port));

    const spy2 = jest.spyOn(multicastV1.sock, "close");
    const spy = jest.spyOn(multicastV1, "close");

    multicastV1.close();

    expect(spy).toHaveBeenCalled();
    expect(spy2).toHaveBeenCalled();
  });

  it("should error when ip multicast not supported", async () => {
    const mock_callback_on_recv = jest.fn();
    const multicastV1 = new MulticastV1(mock_callback_on_recv);

    await expect(
      multicastV1.init("192.168.1.89", single_uint16(m_port))
    ).resolves.toEqual(single_int8(MULTICAST_DEFS.ADDRESS_PROHIBITED));
  });

  it("should error when use false interface", async () => {
    const mock_callback_on_recv = jest.fn();
    const multicastV1 = new MulticastV1(mock_callback_on_recv);

    await expect(
      multicastV1.init("224.168.1.89", single_uint16(m_port), "eno69")
    ).resolves.toEqual(single_int8(MULTICAST_DEFS.INTERFACE_NOT_FOUND));
  });

  it("should error when interface not be able to use", async () => {
    const mock_callback_on_recv = jest.fn();
    const multicastV1 = new MulticastV1(mock_callback_on_recv);

    await expect(
      multicastV1.init("224.168.1.89", single_uint16(m_port), "lo")
    ).resolves.toEqual(single_int8(MULTICAST_DEFS.PROHIBITED_INTERFACE));
  });
});

describe("Multicast send and recv", () => {
  const msg_to_send = "irisits";

  it("should send message", async () => {
    const mock_callback_on_recv = jest.fn();
    const multicastV1 = new MulticastV1(mock_callback_on_recv);

    await multicastV1.init(m_ip, single_uint16(m_port));

    const spy2 = jest.spyOn(multicastV1.sock, "send");
    const spy = jest.spyOn(multicastV1, "send");
    const ret_send = multicastV1.send(msg_to_send);

    expect(spy).toHaveBeenCalled();
    expect(spy2).toHaveBeenCalledWith(
      msg_to_send,
      0,
      msg_to_send.length,
      m_port,
      m_ip
    );
    expect(ret_send).toEqual(single_int8(MULTICAST_DEFS.SUCCESS));
  });

  it("should receive a message", async () => {
    const mock_callback_on_recv = jest.fn();
    const multicastV1 = new MulticastV1(mock_callback_on_recv);

    let recv_data: any;
    let recv_addr: any;

    mock_callback_on_recv.mockImplementation((data: any, sender: any) => {
      recv_data = data.toString();
      recv_addr = sender.address;
    });

    await multicastV1.init(m_ip, single_uint16(m_port));

    const cllbck_recv = jest.fn();
    const m_sender = new MulticastV1(cllbck_recv);

    m_sender.init(m_ip, single_uint16(m_port));
    m_sender.send(msg_to_send);

    // wait a bit ms
    setTimeout(() => {
      expect(mock_callback_on_recv).toHaveBeenCalled();
      expect(recv_data).toEqual(msg_to_send);
    }, 10);
  });
});
