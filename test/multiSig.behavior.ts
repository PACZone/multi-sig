import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { initializeFixture, RunContext } from "./Initialize.fixture";
import { MultiSig, MultiSig__factory } from "../typechain-types";
import { ethers } from "hardhat";

export function shouldBehaveLikeMultiSig() {
  let context: RunContext;
  let multiSig: MultiSig;

  let OWNER_ROLE: string;
  let MANAGER_ROLE: string;
  let HOT_APPROVER_ROLE: string;
  let COLD_APPROVER_ROLE: string;
  let DEFAULT_ADMIN_ROLE: string;

  let MultiSigFactory: MultiSig__factory;

  beforeEach(async () => {
    context = await loadFixture(initializeFixture);
    multiSig = context.multiSig;

    const tx = {
      to: await multiSig.getAddress(),
      value: ethers.parseEther("1"),
    };

    await context.signers.owner.sendTransaction(tx);

    MultiSigFactory = await ethers.getContractFactory("MultiSig");

    OWNER_ROLE = await multiSig.OWNER_ROLE();
    MANAGER_ROLE = await multiSig.MANAGER_ROLE();
    HOT_APPROVER_ROLE = await multiSig.HOT_APPROVER_ROLE();
    COLD_APPROVER_ROLE = await multiSig.COLD_APPROVER_ROLE();
    DEFAULT_ADMIN_ROLE = await multiSig.DEFAULT_ADMIN_ROLE();
  });

  describe("Deployment", function () {
    it("should set up parties with correct roles", async function () {
      const roles = [OWNER_ROLE, MANAGER_ROLE, HOT_APPROVER_ROLE, COLD_APPROVER_ROLE];
      const parties = [
        context.signers.owner.address,
        context.signers.manager.address,
        context.signers.hotApprover.address,
        context.signers.coldApprover.address,
      ];

      for (const [index, party] of parties.entries()) {
        expect(await multiSig.isParty(party)).to.be.true;
        expect(await multiSig.hasRole(roles[index], party)).to.be.true;
      }
    });

    it("should revert if any party address is zero", async function () {
      await expect(
        MultiSigFactory.deploy(
          ethers.ZeroAddress,
          context.signers.manager.address,
          context.signers.hotApprover.address,
          context.signers.coldApprover.address
        )
      ).to.be.revertedWithCustomError(multiSig, "InvalidPartyAddress");

      await expect(
        MultiSigFactory.deploy(
          context.signers.owner.address,
          ethers.ZeroAddress,
          context.signers.hotApprover.address,
          context.signers.coldApprover.address
        )
      ).to.be.revertedWithCustomError(multiSig, "InvalidPartyAddress");

      await expect(
        MultiSigFactory.deploy(
          context.signers.owner.address,
          context.signers.manager.address,
          ethers.ZeroAddress,
          context.signers.coldApprover.address
        )
      ).to.be.revertedWithCustomError(multiSig, "InvalidPartyAddress");

      await expect(
        MultiSigFactory.deploy(
          context.signers.owner.address,
          context.signers.manager.address,
          context.signers.hotApprover.address,
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(multiSig, "InvalidPartyAddress");
    });

    it("should revert if a party address is duplicated", async function () {
      await expect(
        MultiSigFactory.deploy(
          context.signers.owner.address,
          context.signers.owner.address, // Duplicate
          context.signers.hotApprover.address,
          context.signers.coldApprover.address
        )
      ).to.be.revertedWithCustomError(multiSig, "PartyNotUnique");
    });
  });

  describe("Proposal Management", function () {
    const proposalId = 1;

    beforeEach(async function () {
      await multiSig.addRule(context.signers.manager.address, "0x00000000", [OWNER_ROLE, MANAGER_ROLE]);
      await multiSig.submitProposal(context.signers.manager.address, "0x00000000", ethers.parseEther("1"));
    });

    describe("Submit Proposal", function () {
      it("should submit a valid proposal", async function () {
        const proposal = await multiSig.Proposals(proposalId);

        expect(proposal.target).to.equal(context.signers.manager.address);
        expect(proposal.value).to.equal(ethers.parseEther("1"));
        expect(proposal.submitter).to.equal(context.signers.owner.address);
        expect(proposal.status).to.equal(0);
      });

      it("should revert if data length wrong", async function () {
        await expect(
          multiSig.submitProposal(context.signers.manager.address, "0x", ethers.parseEther("1"))
        ).to.be.revertedWithCustomError(multiSig, "InvalidData");
      });
    });

    describe("Confirm Proposal", function () {
      it("should allow a party with the correct role to confirm", async function () {
        await multiSig.connect(context.signers.owner).confirmProposal(proposalId, OWNER_ROLE);
        await multiSig.connect(context.signers.manager).confirmProposal(proposalId, MANAGER_ROLE);

        expect(await multiSig.confirmations(proposalId, MANAGER_ROLE)).to.be.true;
        expect(await multiSig.confirmations(proposalId, OWNER_ROLE)).to.be.true;
      });

      it("should revert if the caller is not a party", async function () {
        await expect(
          multiSig.connect(context.signers.user1).confirmProposal(proposalId, OWNER_ROLE)
        ).to.be.revertedWithCustomError(multiSig, "NotParty");
      });

      it("should revert if the role is already confirmed", async function () {
        await multiSig.connect(context.signers.owner).confirmProposal(proposalId, OWNER_ROLE);
        await expect(
          multiSig.connect(context.signers.owner).confirmProposal(proposalId, OWNER_ROLE)
        ).to.be.revertedWithCustomError(multiSig, "TransactionAlreadyConfirmed");
      });

      it("should revert if the role is not in confirmor", async function () {
        await expect(
          multiSig.connect(context.signers.hotApprover).confirmProposal(proposalId, HOT_APPROVER_ROLE)
        ).to.be.revertedWithCustomError(multiSig, "InvalidRole");
      });
    });

    describe("Revoke Confirmation", function () {
      beforeEach(async function () {
        await multiSig.connect(context.signers.owner).confirmProposal(proposalId, OWNER_ROLE);
      });

      it("should allow a party to revoke their confirmation", async function () {
        await multiSig.connect(context.signers.owner).revokeConfirmation(proposalId, OWNER_ROLE);

        expect(await multiSig.confirmations(proposalId, OWNER_ROLE)).to.be.false;
      });

      it("should revert if the caller is not a party", async function () {
        await expect(
          multiSig.connect(context.signers.user1).revokeConfirmation(proposalId, OWNER_ROLE)
        ).to.be.revertedWithCustomError(multiSig, "NotParty");
      });

      it("should revert if the role was not confirmed", async function () {
        await expect(
          multiSig.connect(context.signers.manager).revokeConfirmation(proposalId, MANAGER_ROLE)
        ).to.be.revertedWithCustomError(multiSig, "TransactionNotConfirmed");
      });
    });

    describe("Execute Proposal", function () {
      beforeEach(async function () {
        await multiSig.connect(context.signers.owner).confirmProposal(proposalId, OWNER_ROLE);
        await multiSig.connect(context.signers.manager).confirmProposal(proposalId, MANAGER_ROLE);
      });

      it("should execute the proposal once all required confirmations are met", async function () {
        const targetBalanceBefore = await ethers.provider.getBalance(context.signers.manager.address);

        await multiSig.addExecutor(context.signers.manager.address, "0x00000000", HOT_APPROVER_ROLE);

        await multiSig.connect(context.signers.hotApprover).executeProposal(proposalId);

        const targetBalanceAfter = await ethers.provider.getBalance(context.signers.manager.address);
        expect(targetBalanceAfter).to.equal(targetBalanceBefore + ethers.parseEther("1"));
      });

      it("should execute the proposal(call another contract) once all required confirmations are met", async function () {
        const SampleContract = await ethers.getContractFactory("SampleContract");
        const sampleContract = await SampleContract.deploy();

        const n = 8;

        await multiSig.addRule(await sampleContract.getAddress(), "0x29e99f07", [OWNER_ROLE, MANAGER_ROLE]);

        const data = sampleContract.interface.encodeFunctionData("test", [n]);
        await multiSig.submitProposal(await sampleContract.getAddress(), data, 0);

        const sampleProposalId = "2";

        await multiSig.connect(context.signers.owner).confirmProposal(sampleProposalId, OWNER_ROLE);
        await multiSig.connect(context.signers.manager).confirmProposal(sampleProposalId, MANAGER_ROLE);

        await multiSig.addExecutor(await sampleContract.getAddress(), "0x29e99f07", HOT_APPROVER_ROLE);

        await expect(multiSig.connect(context.signers.hotApprover).executeProposal(sampleProposalId)).to.be.not
          .reverted;
        expect(await sampleContract.storedNumber()).to.be.equal(n);
      });

      it("should revert if required confirmations are not met", async function () {
        await multiSig.addExecutor(context.signers.manager.address, "0x00000000", HOT_APPROVER_ROLE);
        await multiSig.connect(context.signers.owner).revokeConfirmation(proposalId, OWNER_ROLE);
        await expect(
          multiSig.connect(context.signers.hotApprover).executeProposal(proposalId)
        ).to.be.revertedWithCustomError(multiSig, "NotEnoughConfirmations");
      });
    });

    it("should revert with the appropriate message when the proposal execution fails", async function () {
      const SampleContract = await ethers.getContractFactory("SampleContract");
      const sampleContract = await SampleContract.deploy();

      await multiSig.addRule(await sampleContract.getAddress(), "0x00000000", [OWNER_ROLE, MANAGER_ROLE]);

      await multiSig.submitProposal(await sampleContract.getAddress(), "0x00000000", ethers.parseEther("1"));

      const failProposalId = "2";

      await multiSig.connect(context.signers.owner).confirmProposal(failProposalId, OWNER_ROLE);
      await multiSig.connect(context.signers.manager).confirmProposal(failProposalId, MANAGER_ROLE);

      await multiSig.addExecutor(await sampleContract.getAddress(), "0x00000000", HOT_APPROVER_ROLE);

      const errMsg = "ABI decoding: invalid tuple offset";

      await expect(multiSig.connect(context.signers.hotApprover).executeProposal(failProposalId)).to.be.revertedWith(
        errMsg
      );
    });

    describe("Modifiers", function () {
      const proposalId = 1;
      beforeEach(async function () {
        await multiSig.submitProposal(context.signers.manager.address, "0x00000000", ethers.parseEther("1"));
      });
      describe("isProposalExist", function () {
        it("should allow function execution for existing proposals", async function () {
          await expect(multiSig.Proposals(proposalId)).not.to.be.reverted;
        });
        it("should revert for non-existent proposals", async function () {
          const invalidProposalId = 999;
          await expect(multiSig.confirmProposal(invalidProposalId, OWNER_ROLE)).to.be.revertedWithCustomError(
            multiSig,
            "ProposalDoesNotExist"
          );
        });
      });
      describe("isProposalSubmitted", function () {
        it("should allow function execution for submitted proposals", async function () {
          await expect(multiSig.confirmProposal(proposalId, OWNER_ROLE)).not.to.be.reverted;
        });
        it("should revert if the proposal is already executed", async function () {
          await multiSig.connect(context.signers.owner).confirmProposal(proposalId, OWNER_ROLE);
          await multiSig.connect(context.signers.manager).confirmProposal(proposalId, MANAGER_ROLE);
          await multiSig.addExecutor(context.signers.manager, "0x00000000", HOT_APPROVER_ROLE);

          await multiSig.connect(context.signers.hotApprover).executeProposal(proposalId);
          await expect(
            multiSig.connect(context.signers.owner).confirmProposal(proposalId, OWNER_ROLE)
          ).to.be.revertedWithCustomError(multiSig, "ProposalAlreadyExecuted");
        });
      });
      describe("isCallerParty", function () {
        it("should allow a valid party to execute", async function () {
          await expect(multiSig.connect(context.signers.owner).confirmProposal(proposalId, OWNER_ROLE)).not.to.be
            .reverted;
        });
        it("should revert if the caller is not a party", async function () {
          await expect(
            multiSig.connect(context.signers.user1).confirmProposal(proposalId, OWNER_ROLE)
          ).to.be.revertedWithCustomError(multiSig, "NotParty");
        });
      });
      describe("isCallerOwner", function () {
        it("should allow owner to execute", async function () {
          await multiSig.connect(context.signers.owner).confirmProposal(proposalId, OWNER_ROLE);
          await multiSig.connect(context.signers.manager).confirmProposal(proposalId, MANAGER_ROLE);
          await multiSig.addExecutor(context.signers.manager, "0x00000000", HOT_APPROVER_ROLE);
          await expect(multiSig.connect(context.signers.hotApprover).executeProposal(proposalId)).not.to.be.reverted;
        });
        it("should revert if the caller is not owner", async function () {
          await expect(
            multiSig.connect(context.signers.manager).executeProposal(proposalId)
          ).to.be.revertedWithCustomError(multiSig, "NotExecutor");
        });
      });
      describe("isRoleValid", function () {
        it("should allow execution for valid roles", async function () {
          await expect(multiSig.connect(context.signers.owner).confirmProposal(proposalId, OWNER_ROLE)).not.to.be
            .reverted;
        });
        it("should revert for invalid roles", async function () {
          const invalidRole = ethers.keccak256(ethers.toUtf8Bytes("INVALID_ROLE"));
          await expect(
            multiSig.connect(context.signers.owner).confirmProposal(proposalId, invalidRole)
          ).to.be.revertedWithCustomError(multiSig, "InvalidRole");
        });
      });
    });
  });
}
