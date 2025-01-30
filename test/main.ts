import { shouldBehaveLikeMultiSig } from "./multiSig.behavior";
import { shouldBehaveLikeMultiSigRecovery } from "./multiSigRecovery.behavior";

describe("MultiSig", () => {
  describe("Static Tests", async function () {
    shouldBehaveLikeMultiSig();
    shouldBehaveLikeMultiSigRecovery();
  });
});
