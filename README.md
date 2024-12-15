# MultiSig Contract Documentation

**MultiSig** is a contract that facilitates decentralized and secure transaction management through a multi-signature mechanism. The contract supports role-based access control, customizable confirmation thresholds, and proposals for executing transactions. It ensures a robust governance model suitable for high-security applications, including fund management and on-chain governance.

This documentation outlines the features, setup instructions, and role definitions of the contract.

---

## Features

- **Multi-Signature Governance**: Transactions require confirmations from multiple roles, ensuring security and decentralized decision-making.
- **Role-Based Access Control**: Employs roles such as `OWNER_ROLE`, `MANAGER_ROLE`, `HOT_APPROVER_ROLE`, and `COLD_APPROVER_ROLE` for structured management.
- **Proposal Submission and Execution**: Transactions are initiated through proposals, which must be confirmed by designated roles before execution.
- **Reentrancy Protection**: Implements OpenZeppelin's `ReentrancyGuard` to safeguard against reentrancy attacks.
- **Upgradeable**: Can be upgraded using the UUPS proxy pattern, ensuring future extensibility.

---

## Contract Roles

- **`OWNER_ROLE`**: Can manage roles, revoke or assign permissions, and execute proposals.
- **`MANAGER_ROLE`**: May be assigned operational responsibilities or limited authority over proposals.
- **`HOT_APPROVER_ROLE` & `COLD_APPROVER_ROLE`**: Act as approvers in the multi-signature mechanism, representing parties with hot or cold keys.
- **`DEFAULT_ADMIN_ROLE`**: Has full control over the contract and typically overlaps with the owner for management purposes.

---

## Core Concepts

### Proposal Lifecycle

1. **Submission**: A proposal is submitted with the transaction details (target, value, data) and the required confirmation roles.
2. **Confirmation**: Approvers confirm the proposal based on their roles. Each role can only confirm once per proposal.
3. **Revocation**: Approvers can revoke their confirmation if needed before execution.
4. **Execution**: After receiving the minimum required confirmations, the proposal is executed, sending the transaction to the target address.

### Confirmation Threshold

The `MIN_CONFIRMATION` parameter determines the minimum number of confirmations required. It is set during contract initialization and must not exceed 4.

---

## Contract Functions

### Proposal Management

- **`submitProposal(address _target, bytes memory _data, uint256 _value, bytes32[] memory _requiredConfirmations)`**  
  Submits a new proposal for execution.  
  Emits: `ProposalSubmitted`.

- **`confirmProposal(uint256 id, bytes32 role)`**  
  Confirms a proposal using the caller's role.  
  Emits: `ProposalConfirmed`.

- **`revokeConfirmation(uint256 id, bytes32 role)`**  
  Revokes a previously made confirmation.  
  Emits: `ProposalRevoked`.

- **`executeProposal(uint256 id)`**  
  Executes a confirmed proposal, transferring funds or executing the associated call.  
  Emits: `ProposalExecuted`.

### Role Management

- **`_addParty(address party, bytes32 role)`**  
  Private function to assign a role to a party. Ensures unique assignment.

### Modifiers

- **`onlyParty`**: Restricts access to parties defined in the contract.  
- **`onlyOwner`**: Restricts access to the owner.  
- **`isProposalExist`**: Ensures the proposal exists.  
- **`isProposalSubmitted`**: Ensures the proposal is in a submitted state.

---

## Events

- **`ProposalSubmitted(uint256 indexed id, address indexed submitter, address indexed target, uint256 value, bytes32[] requiredConfirmations)`**  
  Emitted when a new proposal is submitted.

- **`ProposalConfirmed(uint256 indexed id, address indexed confirmer)`**  
  Emitted when a proposal is confirmed.

- **`ProposalRevoked(uint256 indexed id, address indexed revoker)`**  
  Emitted when a confirmation is revoked.

- **`ProposalExecuted(uint256 indexed id, address indexed executor)`**  
  Emitted when a proposal is executed.

---

## Deployment

1. Set up the `.env` file as per the **ZarToken** instructions.
2. Deploy the contract using the following command:

    ```bash
    npx hardhat deploy:MultiSig --owner-address 0xOwnerAddressHere --manager-address 0xManagerAddressHere --hot-approver-address 0xHotApproverAddressHere --cold-approver-address 0xColdApproverAddressHere --min-confirmation 2 --network rinkeby
    ```

### Constructor Parameters

- **`ownerAddress`**: Address of the owner.
- **`managerAddress`**: Address of the manager.
- **`hotApproverAddress`**: Address of the hot key approver.
- **`coldApproverAddress`**: Address of the cold key approver.
- **`minConfirmation`**: Minimum number of confirmations required for proposals.

---

## Testing

1. Write unit tests covering scenarios such as proposal submission, confirmation, revocation, execution, and role-based access control.
2. Run the tests:

    ```bash
    npx hardhat test
    ```
