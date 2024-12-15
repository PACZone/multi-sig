import { ethers, run } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MultiSig } from "../typechain-types";

export class RunContext {
  signers!: {
    owner: SignerWithAddress;
    manager: SignerWithAddress;
    hotApprover: SignerWithAddress;
    coldApprover: SignerWithAddress;
    user1: SignerWithAddress;
    user2: SignerWithAddress;
  };
  multiSig!: MultiSig;
}

export async function initializeFixture(): Promise<RunContext> {
  const context = new RunContext();

  // Retrieve signers
  const signers: SignerWithAddress[] = await ethers.getSigners();
  context.signers = {
    owner: signers[0],
    manager: signers[1],
    hotApprover: signers[2],
    coldApprover: signers[3],
    user1: signers[4],
    user2: signers[5],
  };

  // Deploy MultiSig contract
  context.multiSig = await run("deploy:MultiSig", {
    ownerAddress: context.signers.owner.address,
    managerAddress: context.signers.manager.address,
    hotApproverAddress: context.signers.hotApprover.address,
    coldApproverAddress: context.signers.coldApprover.address,
    minConfirmation: "2",
  });

  return context;
}
