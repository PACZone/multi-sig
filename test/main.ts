import { shouldBehaveLikeMultiSig } from "./multiSig.behavior";

describe("MultiSig", () => {
  describe("Static Tests", async function () {
    shouldBehaveLikeMultiSig();
  });
});
