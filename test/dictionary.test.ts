import { Dictionary } from "../src/dictionary";
import { single_int8 } from "../src/utils";

describe("Basic dictionary", () => {
  it("should error if did not use valid json filepath", () => {
    const cllbck = jest.fn();
    const dictionary = new Dictionary(cllbck);

    expect(
      dictionary.init(single_int8(0), "/home/wildan/proyek/icast-js/")
    ).toEqual(single_int8(-1));
  });

  it("should read and parse JSON", (done) => {
    const cllbck = jest.fn();
    const dictionary = new Dictionary(cllbck);

    dictionary.init(
      single_int8(0),
      "/home/wildan/proyek/icast-js/dictionary.json"
    );

    setTimeout(() => {
      expect(cllbck).toHaveBeenCalledWith(single_int8(0));
      done();
    }, 20);
  });
});
