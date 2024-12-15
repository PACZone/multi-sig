import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("deploy:MultiSig", "Deploys the MultiSig")
  .addParam<string>("ownerAddress", "The address of the owner")
  .addParam<string>("managerAddress", "The address of the manager")
  .addParam<string>("hotApproverAddress", "The address of the hot approver")
  .addParam<string>("coldApproverAddress", "The address of the cold approver")
  .setAction(
    async (
      { ownerAddress, managerAddress, hotApproverAddress, coldApproverAddress },
      { ethers }: HardhatRuntimeEnvironment
    ) => {
      console.log("Running deploy:MultiSig");

      const [deployer] = await ethers.getSigners();

      console.log("	Deployer address:", deployer.address);
      console.log("	ownerAddress addresses:", ownerAddress);
      console.log("	managerAddress addresses:", managerAddress);
      console.log("	hotApproverAddress addresses:", hotApproverAddress);
      console.log("	coldApproverAddress addresses:", coldApproverAddress);

      const addresses = [ownerAddress, managerAddress, hotApproverAddress, coldApproverAddress];

      for (const a of addresses) {
        if (!ethers.isAddress(a.trim())) {
          throw new Error(`Invalid address: ${a}`);
        }
      }

      const MultiSigFactory = await ethers.getContractFactory("MultiSig");
      const MultiSig = await MultiSigFactory.deploy(
        ownerAddress,
        managerAddress,
        hotApproverAddress,
        coldApproverAddress,
      );
      await MultiSig.waitForDeployment();

      const address = await MultiSig.getAddress();

      console.log("MultiSig deployed:");
      console.log("	address:", address);

      return MultiSig;
    }
  );
