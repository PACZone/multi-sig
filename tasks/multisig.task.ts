import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("deploy:MultiSig", "Deploys the MultiSig")
  .addParam<string>("pactusFoundationAddress", "The address of the Pactus Foundation")
  .addParam<string>("wraptoTeamAddress", "The address of the Wrapto Team")
  .setAction(
    async (
      { pactusFoundationAddress, wraptoTeamAddress, hotApproverAddress, coldApproverAddress },
      { ethers }: HardhatRuntimeEnvironment
    ) => {
      console.log("Running deploy:MultiSig");

      const [deployer] = await ethers.getSigners();

      console.log("	Deployer address:", deployer.address);
      console.log("	pactusFoundationAddress addresses:", pactusFoundationAddress);
      console.log("	wraptoTeamAddress addresses:", wraptoTeamAddress);

      const addresses = [pactusFoundationAddress, wraptoTeamAddress];

      for (const a of addresses) {
        if (!ethers.isAddress(a.trim())) {
          throw new Error(`Invalid address: ${a}`);
        }
      }

      const MultiSigFactory = await ethers.getContractFactory("MultiSig");
      const MultiSig = await MultiSigFactory.deploy(pactusFoundationAddress, wraptoTeamAddress);
      await MultiSig.waitForDeployment();

      const address = await MultiSig.getAddress();

      console.log("MultiSig deployed:");
      console.log("	address:", address);

      return MultiSig;
    }
  );
