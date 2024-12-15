import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import * as dotenv from "dotenv";
import "hardhat-gas-reporter";
import { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";

import "./tasks/multisig.task";

dotenv.config();

const accounts_list: any = [process.env.ACCOUNT];

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  gasReporter: {
    currency: "USD",
    enabled: true,
    excludeContracts: [],
    src: "./contracts",
  },
  solidity: {
    version: "0.8.27",
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/hardhat-template/issues/31
        bytecodeHash: "none",
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      debug: {
        revertStrings: "debug",
      },
    },
  },
  networks: {
    amoy: {
      url: "https://rpc-amoy.polygon.technology",
      accounts: accounts_list,
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: "ZWKG2IY8DTD8MBGCMST8UI8BR4IPKAA3H2",
    },
    customChains: [],
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
};

export default config;
