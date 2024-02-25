import { Dictionary } from "../src/dictionary";
import { DICTIONARY_DEFS, single_int8 } from "../src/utils";

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
});
