import { ethers, run } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MultiSig } from "../typechain-types";

export class RunContext {
  signers!: {
    pactusFoundation: SignerWithAddress;
    wraptoTeam: SignerWithAddress;
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
    pactusFoundation: signers[0],
    wraptoTeam: signers[1],
    user1: signers[4],
    user2: signers[5],
  };

  // Deploy MultiSig contract
  context.multiSig = await run("deploy:MultiSig", {
    pactusFoundationAddress: context.signers.pactusFoundation.address,
    wraptoTeamAddress: context.signers.wraptoTeam.address,
  });

  return context;
}
