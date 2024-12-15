// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMultiSig {
  struct Proposal {
    bytes data;
    uint256 value;
    address target;
    address submitter;
    ProposalStatus status;
    bytes32[] requiredConfirmations;
  }

  enum ProposalStatus {
    SUBMITTED,
    EXECUTED
  }

  error NotParty();
  error ProposalDoesNotExist(uint256 id);
  error ProposalAlreadyExecuted(uint256 id);
  error InvalidConfirmationCount();
  error InvalidPartyAddress(address party);
  error PartyNotUnique(address party);
  error TransactionAlreadyConfirmed(uint256 id);
  error InvalidRole(uint256 id);
  error RoleConfirmed(uint256 id);
  error RoleNotConfirmed(uint256 id);
  error TransactionNotConfirmed(uint256 id);
  error NotEnoughConfirmations(uint256 id);
  error TransactionFailed(uint256 id);
  error NotOwner();
  error RuleAlreadyExists();
  error InvalidData();
  error NotExecutor();

  event ProposalSubmitted(
    uint256 indexed id,
    address indexed submitter,
    address target,
    uint256 value,
    bytes32[] requiredConfirmations
  );
  event ProposalConfirmed(uint256 indexed id, address indexed confirmer);
  event ProposalRevoked(uint256 indexed id, address indexed revoker);
  event ProposalExecuted(uint256 indexed id, address indexed executor);
}
