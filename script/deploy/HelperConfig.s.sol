// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";

abstract contract CodeConstants {
    uint256 public constant AVALANCHE_FUJI_CHAIN_ID = 43113;
}

contract HelperConfig is CodeConstants, Script {
    error InvalidChainId();

    struct NetworkConfig {
        address router;
        address link;
        uint256 deployerKey;
    }

    mapping(uint256 chainId => NetworkConfig networkConfig) public networkConfigs;

    constructor() {
        networkConfigs[AVALANCHE_FUJI_CHAIN_ID] = getAvalancheFujiConfig();
    }

    function getConfig() public view returns (NetworkConfig memory) {
        return getConfigByChainId(block.chainid);
    }

    function getConfigByChainId(uint256 chainId) public view returns (NetworkConfig memory) {
        return networkConfigs[chainId];
    }

    function getAvalancheFujiConfig() public view returns (NetworkConfig memory ethNetworkConfig) {
        ethNetworkConfig = NetworkConfig({
            router: 0xF694E193200268f9a4868e4Aa017A0118C9a8177,
            link: 0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846,
            deployerKey: vm.envUint("PRIVATE_KEY")
        });
    }
}
