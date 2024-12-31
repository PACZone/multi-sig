import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { initializeFixture, RunContext } from "./Initialize.fixture";
import { MultiSig, MultiSig__factory } from "../typechain-types";
import { ethers } from "hardhat";

export function shouldBehaveLikeMultiSig() {
  let context: RunContext;
  let multiSig: MultiSig;

  let PACTUS_FOUNDATION: string;
  let WRAPTO_TEAM: string;

  let MultiSigFactory: MultiSig__factory;

  beforeEach(async () => {
    context = await loadFixture(initializeFixture);
    multiSig = context.multiSig;

    const tx = {
      to: await multiSig.getAddress(),
      value: ethers.parseEther("1"),
    };

    await context.signers.pactusFoundation.sendTransaction(tx);

    MultiSigFactory = await ethers.getContractFactory("MultiSig");

    WRAPTO_TEAM = await multiSig.WRAPTO_TEAM();
    PACTUS_FOUNDATION = await multiSig.PACTUS_FOUNDATION();
  });

  describe("Deployment", function () {
    it("should set up parties with correct roles", async function () {
      const roles = [WRAPTO_TEAM, PACTUS_FOUNDATION];
      const parties = [context.signers.wraptoTeam.address, context.signers.pactusFoundation.address];

      for (const [index, party] of parties.entries()) {
        expect(await multiSig.isParty(party)).to.be.true;
        expect(await multiSig.hasRole(roles[index], party)).to.be.true;
      }
    });

    it("should revert if any party address is zero", async function () {
      await expect(
        MultiSigFactory.deploy(ethers.ZeroAddress, context.signers.wraptoTeam.address)
      ).to.be.revertedWithCustomError(multiSig, "InvalidPartyAddress");

      await expect(
        MultiSigFactory.deploy(context.signers.pactusFoundation.address, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(multiSig, "InvalidPartyAddress");

      it("should revert if a party address is duplicated", async function () {
        await expect(
          MultiSigFactory.deploy(
            context.signers.pactusFoundation.address,
            context.signers.pactusFoundation.address // Duplicate
          )
        ).to.be.revertedWithCustomError(multiSig, "PartyNotUnique");
      });
    });

    describe("Proposal Management", function () {
      const proposalId = 1;

      beforeEach(async function () {
        await multiSig.submitProposal(context.signers.wraptoTeam.address, "0x00000000", ethers.parseEther("1"));
      });

      describe("Submit Proposal", function () {
        it("should submit a valid proposal", async function () {
          const proposal = await multiSig.Proposals(proposalId);

          expect(proposal.target).to.equal(context.signers.wraptoTeam.address);
          expect(proposal.value).to.equal(ethers.parseEther("1"));
          expect(proposal.submitter).to.equal(context.signers.pactusFoundation.address);
          expect(proposal.status).to.equal(0);
        });

        it("should revert if data length wrong", async function () {
          await expect(
            multiSig.submitProposal(context.signers.wraptoTeam.address, "0x", ethers.parseEther("1"))
          ).to.be.revertedWithCustomError(multiSig, "InvalidData");
        });
      });

      describe("Confirm Proposal", function () {
        it("should allow a party with the correct role to confirm", async function () {
          await multiSig.connect(context.signers.pactusFoundation).confirmProposal(proposalId, PACTUS_FOUNDATION);
          await multiSig.connect(context.signers.wraptoTeam).confirmProposal(proposalId, WRAPTO_TEAM);

          expect(await multiSig.confirmations(proposalId, WRAPTO_TEAM)).to.be.true;
          expect(await multiSig.confirmations(proposalId, PACTUS_FOUNDATION)).to.be.true;
        });

        it("should revert if the caller is not a party", async function () {
          await expect(
            multiSig.connect(context.signers.user1).confirmProposal(proposalId, PACTUS_FOUNDATION)
          ).to.be.revertedWithCustomError(multiSig, "NotParty");
        });

        it("should revert if the role is already confirmed", async function () {
          await multiSig.connect(context.signers.pactusFoundation).confirmProposal(proposalId, PACTUS_FOUNDATION);
          await expect(
            multiSig.connect(context.signers.pactusFoundation).confirmProposal(proposalId, PACTUS_FOUNDATION)
          ).to.be.revertedWithCustomError(multiSig, "TransactionAlreadyConfirmed");
        });

        describe("Revoke Confirmation", function () {
          beforeEach(async function () {
            await multiSig.connect(context.signers.pactusFoundation).confirmProposal(proposalId, PACTUS_FOUNDATION);
          });

          it("should allow a party to revoke their confirmation", async function () {
            await multiSig.connect(context.signers.pactusFoundation).revokeConfirmation(proposalId, PACTUS_FOUNDATION);

            expect(await multiSig.confirmations(proposalId, PACTUS_FOUNDATION)).to.be.false;
          });

          it("should revert if the caller is not a party", async function () {
            await expect(
              multiSig.connect(context.signers.user1).revokeConfirmation(proposalId, PACTUS_FOUNDATION)
            ).to.be.revertedWithCustomError(multiSig, "NotParty");
          });

          it("should revert if the role was not confirmed", async function () {
            await expect(
              multiSig.connect(context.signers.wraptoTeam).revokeConfirmation(proposalId, WRAPTO_TEAM)
            ).to.be.revertedWithCustomError(multiSig, "TransactionNotConfirmed");
          });
        });

        describe("Execute Proposal", function () {
          beforeEach(async function () {
            await multiSig.connect(context.signers.pactusFoundation).confirmProposal(proposalId, PACTUS_FOUNDATION);
            await multiSig.connect(context.signers.wraptoTeam).confirmProposal(proposalId, WRAPTO_TEAM);
          });

          it("should execute the proposal once all required confirmations are met", async function () {
            const targetBalanceBefore = await ethers.provider.getBalance(context.signers.wraptoTeam.address);

            await multiSig.executeProposal(proposalId);

            const targetBalanceAfter = await ethers.provider.getBalance(context.signers.wraptoTeam.address);
            expect(targetBalanceAfter).to.equal(targetBalanceBefore + ethers.parseEther("1"));
          });

          it("should execute the proposal(call another contract) once all required confirmations are met", async function () {
            const SampleContract = await ethers.getContractFactory("SampleContract");
            const sampleContract = await SampleContract.deploy();

            const n = 8;

            const data = sampleContract.interface.encodeFunctionData("test", [n]);
            await multiSig.submitProposal(await sampleContract.getAddress(), data, 0);

            const sampleProposalId = "2";

            await multiSig
              .connect(context.signers.pactusFoundation)
              .confirmProposal(sampleProposalId, PACTUS_FOUNDATION);
            await multiSig.connect(context.signers.wraptoTeam).confirmProposal(sampleProposalId, WRAPTO_TEAM);

            await expect(multiSig.executeProposal(sampleProposalId)).to.be.not
              .reverted;
            expect(await sampleContract.storedNumber()).to.be.equal(n);
          });

          it("should revert if required confirmations are not met", async function () {
            await multiSig.connect(context.signers.pactusFoundation).revokeConfirmation(proposalId, PACTUS_FOUNDATION);
            await expect(
              multiSig.connect(context.signers.wraptoTeam).executeProposal(proposalId)
            ).to.be.revertedWithCustomError(multiSig, "NotEnoughConfirmations");
          });
        });

        it("should revert with the appropriate message when the proposal execution fails", async function () {
          const SampleContract = await ethers.getContractFactory("SampleContract");
          const sampleContract = await SampleContract.deploy();

          await multiSig.submitProposal(await sampleContract.getAddress(), "0x00000000", ethers.parseEther("1"));

          const failProposalId = "2";

          await multiSig.connect(context.signers.pactusFoundation).confirmProposal(failProposalId, PACTUS_FOUNDATION);
          await multiSig.connect(context.signers.wraptoTeam).confirmProposal(failProposalId, WRAPTO_TEAM);

          const errMsg = "ABI decoding: invalid tuple offset";

          await expect(
            multiSig.connect(context.signers.pactusFoundation).executeProposal(failProposalId)
          ).to.be.revertedWith(errMsg);
        });

        describe("Modifiers", function () {
          const proposalId = 1;
          beforeEach(async function () {
            await multiSig.submitProposal(context.signers.wraptoTeam.address, "0x00000000", ethers.parseEther("1"));
          });
          describe("isProposalExist", function () {
            it("should allow function execution for existing proposals", async function () {
              await expect(multiSig.Proposals(proposalId)).not.to.be.reverted;
            });
            it("should revert for non-existent proposals", async function () {
              const invalidProposalId = 999;
              await expect(
                multiSig.confirmProposal(invalidProposalId, PACTUS_FOUNDATION)
              ).to.be.revertedWithCustomError(multiSig, "ProposalDoesNotExist");
            });
          });
          describe("isProposalSubmitted", function () {
            it("should allow function execution for submitted proposals", async function () {
              await expect(multiSig.confirmProposal(proposalId, PACTUS_FOUNDATION)).not.to.be.reverted;
            });
            it("should revert if the proposal is already executed", async function () {
              await multiSig.connect(context.signers.pactusFoundation).confirmProposal(proposalId, PACTUS_FOUNDATION);
              await multiSig.connect(context.signers.wraptoTeam).confirmProposal(proposalId, WRAPTO_TEAM);

              await multiSig.connect(context.signers.pactusFoundation).executeProposal(proposalId);
              await expect(
                multiSig.connect(context.signers.pactusFoundation).confirmProposal(proposalId, PACTUS_FOUNDATION)
              ).to.be.revertedWithCustomError(multiSig, "ProposalAlreadyExecuted");
            });
          });
          describe("isCallerParty", function () {
            it("should allow a valid party to execute", async function () {
              await expect(
                multiSig.connect(context.signers.pactusFoundation).confirmProposal(proposalId, PACTUS_FOUNDATION)
              ).not.to.be.reverted;
            });
            it("should revert if the caller is not a party", async function () {
              await expect(
                multiSig.connect(context.signers.user1).confirmProposal(proposalId, PACTUS_FOUNDATION)
              ).to.be.revertedWithCustomError(multiSig, "NotParty");
            });
          });
          describe("isCallerOwner", function () {
            it("should allow owner to execute", async function () {
              await multiSig.connect(context.signers.pactusFoundation).confirmProposal(proposalId, PACTUS_FOUNDATION);
              await multiSig.connect(context.signers.wraptoTeam).confirmProposal(proposalId, WRAPTO_TEAM);
              await expect(multiSig.executeProposal(proposalId)).not.to.be
                .reverted;
            });
          });
          describe("isRoleValid", function () {
            it("should allow execution for valid roles", async function () {
              await expect(
                multiSig.connect(context.signers.pactusFoundation).confirmProposal(proposalId, PACTUS_FOUNDATION)
              ).not.to.be.reverted;
            });
            it("should revert for invalid roles", async function () {
              const invalidRole = ethers.keccak256(ethers.toUtf8Bytes("INVALID_ROLE"));
              await expect(
                multiSig.connect(context.signers.pactusFoundation).confirmProposal(proposalId, invalidRole)
              ).to.be.revertedWithCustomError(multiSig, "InvalidRole");
            });
          });
        });
      });
    });
  });
}
