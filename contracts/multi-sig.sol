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

  bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
  bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
  bytes32 public constant HOT_APPROVER_ROLE = keccak256("HOT_APPROVER_ROLE");
  bytes32 public constant COLD_APPROVER_ROLE = keccak256("COLD_APPROVER_ROLE");

  // State Variables
  uint256 public counter;
  mapping(address => bool) public isParty;
  mapping(uint256 => Proposal) public Proposals;
  mapping(uint256 => mapping(bytes32 => bool)) public confirmations;
  mapping(uint256 => mapping(address => bool)) public isConfirm;

  mapping(address => mapping(bytes4 => bytes32[])) public rules;
  mapping(address => mapping(bytes4 => bytes32)) public executor;

  receive() external payable {}

  // Modifiers
  modifier onlyParty() {
    if (!isParty[_msgSender()]) revert NotParty();
    _;
  }

  modifier onlyOwner() {
    if (!hasRole(OWNER_ROLE, _msgSender())) revert NotOwner();
    _;
  }

  modifier onlyExecutor(uint256 proposalId) {
    Proposal memory proposal = Proposals[proposalId];
    bytes4 selector = proposal.data.extractSelector();
    if (!hasRole(executor[proposal.target][selector], _msgSender())) revert NotExecutor();
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
  constructor(address ownerAddress, address managerAddress, address hotApproverAddress, address coldApproverAddress) {
    if (
      ownerAddress == address(0) ||
      managerAddress == address(0) ||
      hotApproverAddress == address(0) ||
      coldApproverAddress == address(0)
    ) revert InvalidPartyAddress(address(0));

    MIN_CONFIRMATION = 2;

    _addParty(ownerAddress, OWNER_ROLE);
    _addParty(managerAddress, MANAGER_ROLE);
    _addParty(hotApproverAddress, HOT_APPROVER_ROLE);
    _addParty(coldApproverAddress, COLD_APPROVER_ROLE);
  }

  // Internal Functions
  function _addRule(address targetAddress, bytes4 funcSig, bytes32[] memory requiredConfirmor) internal {
    if (rules[targetAddress][funcSig].length > 0) {
      revert RuleAlreadyExists();
    }

    if (requiredConfirmor.length < MIN_CONFIRMATION) revert InvalidConfirmationCount();

    rules[targetAddress][funcSig] = requiredConfirmor;
  }

  function _addExecutor(address targetAddress, bytes4 funcSig, bytes32 executorRole) internal {
    executor[targetAddress][funcSig] = executorRole;
  }

  function _addParty(address party, bytes32 role) private {
    if (isParty[party]) revert PartyNotUnique(party);
    _grantRole(role, party);
    isParty[party] = true;
  }

  // Public Functions
  function addRule(address targetAddress, bytes4 funcSig, bytes32[] memory requiredConfirmor) public onlyOwner {
    _addRule(targetAddress, funcSig, requiredConfirmor);
  }

  function addExecutor(address targetAddress, bytes4 funcSig, bytes32 executorRole) public onlyOwner {
    _addExecutor(targetAddress, funcSig, executorRole);
  }

  function submitProposal(address _target, bytes calldata _data, uint256 _value) public returns (uint256) {
    if (_data.length < 4) revert InvalidData();
    bytes4 selector = _data.extractSelector();
    bytes32[] memory x = rules[_target][selector];

    if(x.length == 0 ) revert();

    counter++;
    Proposal storage proposal = Proposals[counter];
    proposal.data = _data;
    proposal.value = _value;
    proposal.target = _target;
    proposal.submitter = _msgSender();
    proposal.status = ProposalStatus.SUBMITTED;
    proposal.requiredConfirmations = x;

    emit ProposalSubmitted(counter, msg.sender, _target, _value, x);

    return counter;
  }

  function confirmProposal(uint256 id, bytes32 role) public onlyParty isProposalExist(id) {
    Proposal memory proposal = Proposals[id];
    if (proposal.status != ProposalStatus.SUBMITTED) revert ProposalAlreadyExecuted(id);
    if (isConfirm[id][msg.sender]) revert TransactionAlreadyConfirmed(id);
    if (!hasRole(role, _msgSender())) revert InvalidRole(id);
    if (confirmations[id][role]) revert RoleConfirmed(id);

    bool isValidRole = false;

    for (uint256 i = 0; i < proposal.requiredConfirmations.length; i++) {
      if (proposal.requiredConfirmations[i] == role) {
        isValidRole = true;
        break;
      }
    }
    if (!isValidRole) revert InvalidRole(id);

    isConfirm[id][msg.sender] = true;
    confirmations[id][role] = true;

    emit ProposalConfirmed(id, msg.sender);
  }

  function revokeConfirmation(uint256 id, bytes32 role) public onlyParty isProposalExist(id) isProposalSubmitted(id) {
    if (!isConfirm[id][msg.sender]) revert TransactionNotConfirmed(id);
    if (!hasRole(role, _msgSender())) revert InvalidRole(id);
    if (!confirmations[id][role]) revert RoleNotConfirmed(id);

    isConfirm[id][msg.sender] = false;
    confirmations[id][role] = false;

    emit ProposalRevoked(id, msg.sender);
  }

  function executeProposal(
    uint256 id
  ) public onlyExecutor(id) isProposalExist(id) isProposalSubmitted(id) nonReentrant returns (bytes memory) {
    Proposal storage proposal = Proposals[id];

    for (uint256 i = 0; i < proposal.requiredConfirmations.length; i++) {
      if (!confirmations[id][proposal.requiredConfirmations[i]]) revert NotEnoughConfirmations(id);
    }

    proposal.status = ProposalStatus.EXECUTED;

    (bool success, bytes memory returnData) = proposal.target.call{value: proposal.value}(proposal.data);
    if (!success) {
      string memory errorMessage = returnData.length > 0 ? abi.decode(returnData, (string)) : "TransactionFailed";
      revert(errorMessage);
    }

    emit ProposalExecuted(id, msg.sender);

    return returnData;
  }
}
