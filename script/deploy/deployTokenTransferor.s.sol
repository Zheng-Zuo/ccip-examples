// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {TokenTransferor} from "src/TokenTransferor.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract DeployTokenTransferor is Script {
    function run() external returns (TokenTransferor, HelperConfig) {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        vm.startBroadcast(config.deployerKey);
        TokenTransferor tokenTransferor = new TokenTransferor(config.router, config.link);
        vm.stopBroadcast();

        return (tokenTransferor, helperConfig);
    }
}
