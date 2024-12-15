// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract SampleContract {
  uint256 public storedNumber = 0;
  function test(uint256 a) public {
    storedNumber = a;
  }
}
