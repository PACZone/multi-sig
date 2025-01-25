// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IMultiSig} from "./interfaces/IMultiSig.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "./utils.sol";

contract MultiSig is IMultiSig, ReentrancyGuard, AccessControl {
  using ExtractSelector for bytes;

  // Constants
  uint256 public MIN_CONFIRMATION;

  bytes32 public constant PACTUS_FOUNDATION = keccak256("PACTUS_FOUNDATION");
  bytes32 public constant WRAPTO_TEAM = keccak256("WRAPTO_TEAM");
  bytes32 public constant RECOVERY_PARTY = keccak256("RECOVERY_PARTY");

  // State Variables
  uint256 public counter;
  mapping(address => bool) public isParty;
  mapping(uint256 => Proposal) public Proposals;
  mapping(uint256 => mapping(bytes32 => bool)) public confirmations;
  mapping(uint256 => mapping(address => bool)) public isConfirm;

  receive() external payable {}

  // Modifiers
  modifier onlyParty() {
    if (!isParty[_msgSender()]) revert NotParty();
    _;
  }

  modifier isProposalExist(uint256 id) {
    if (Proposals[id].submitter == address(0)) revert ProposalDoesNotExist(id);
    _;
  }

  modifier isProposalSubmitted(uint256 id) {
    if (Proposals[id].status != ProposalStatus.SUBMITTED) revert ProposalAlreadyExecuted(id);
    _;
  }

  // Constructor
  constructor(address pactusFoundationAddress, address wraptoTeamAddress, address recoveryParty) {
    if (pactusFoundationAddress == address(0) || wraptoTeamAddress == address(0) || recoveryParty == address(0))
      revert InvalidPartyAddress(address(0));

    MIN_CONFIRMATION = 2;

    _addParty(pactusFoundationAddress, PACTUS_FOUNDATION);
    _addParty(wraptoTeamAddress, WRAPTO_TEAM);
    _addParty(recoveryParty, RECOVERY_PARTY);
  }

  function _addParty(address party, bytes32 role) internal {
    if (isParty[party]) revert PartyNotUnique(party);
    _grantRole(role, party);
    isParty[party] = true;
  }

  // Public Functions
  function submitProposal(address _target, bytes calldata _data, uint256 _value) public returns (uint256) {
    if (_data.length < 4) revert InvalidData();

    counter++;
    Proposal storage proposal = Proposals[counter];
    proposal.data = _data;
    proposal.value = _value;
    proposal.target = _target;
    proposal.submitter = _msgSender();
    proposal.status = ProposalStatus.SUBMITTED;

    emit ProposalSubmitted(counter, _msgSender(), _target, _value);

    return counter;
  }

  function confirmProposal(uint256 id, bytes32 role) public onlyParty isProposalExist(id) {
    Proposal memory proposal = Proposals[id];
    if (proposal.status != ProposalStatus.SUBMITTED) revert ProposalAlreadyExecuted(id);
    if (isConfirm[id][_msgSender()]) revert TransactionAlreadyConfirmed(id);
    if (!hasRole(role, _msgSender())) revert InvalidRole(id);
    if (confirmations[id][role]) revert RoleConfirmed(id);

    isConfirm[id][_msgSender()] = true;
    confirmations[id][role] = true;

    emit ProposalConfirmed(id, _msgSender());
  }

  function revokeConfirmation(uint256 id, bytes32 role) public onlyParty isProposalExist(id) isProposalSubmitted(id) {
    if (!isConfirm[id][_msgSender()]) revert TransactionNotConfirmed(id);
    if (!hasRole(role, _msgSender())) revert InvalidRole(id);
    if (!confirmations[id][role]) revert RoleNotConfirmed(id);

    isConfirm[id][_msgSender()] = false;
    confirmations[id][role] = false;

    emit ProposalRevoked(id, _msgSender());
  }

  function executeProposal(
    uint256 id
  ) public isProposalExist(id) isProposalSubmitted(id) nonReentrant returns (bytes memory) {
    Proposal storage proposal = Proposals[id];

    if (!confirmations[id][PACTUS_FOUNDATION]) revert NotEnoughConfirmations(id);
    if (!confirmations[id][WRAPTO_TEAM]) revert NotEnoughConfirmations(id);

    proposal.status = ProposalStatus.EXECUTED;

    (bool success, bytes memory returnData) = proposal.target.call{value: proposal.value}(proposal.data);
    if (!success) {
      string memory errorMessage = returnData.length > 0 ? abi.decode(returnData, (string)) : "TransactionFailed";
      revert(errorMessage);
    }

    emit ProposalExecuted(id, _msgSender());

    return returnData;
  }
}
