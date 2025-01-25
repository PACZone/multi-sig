import { ethers, run } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MultiSig } from "../typechain-types";

export class RunContext {
  signers!: {
    pactusFoundation: SignerWithAddress;
    wraptoTeam: SignerWithAddress;
    recovertParty: SignerWithAddress;
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
    recovertParty: signers[2],
    user1: signers[3],
    user2: signers[4],
  };

  // Deploy MultiSig contract
  context.multiSig = await run("deploy:MultiSig", {
    pactusFoundationAddress: context.signers.pactusFoundation.address,
    wraptoTeamAddress: context.signers.wraptoTeam.address,
    recoveryPartyAddress: context.signers.recovertParty.address,
  });

  return context;
}
