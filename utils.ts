import { ethers } from "ethers";

// Define the contract ABI
const abi = [];

const contractInterface = new ethers.Interface(abi);

// Encode function data
const encodedData = contractInterface.encodeFunctionData("blablabla", [
  "0x000000",
]);

console.log("Encoded Function Data:", encodedData);
