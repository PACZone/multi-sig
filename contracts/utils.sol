// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library ExtractSelector {
  /**
   * @dev Extracts the first 4 bytes (function selector) from the provided calldata.
   * @param data The calldata from which to extract the function selector.
   * @return selector The first 4 bytes of the calldata, representing the function selector.
   */
  function extractSelector(bytes memory data) internal pure returns (bytes4 selector) {
    assembly {
      selector := mload(add(data, 32))
    }
  }
}
