import { ethers } from "ethers";
import routerAbi from "./abi/router.json";
import usd1Abi from "./abi/usd1.json";
import ccipNetworkConfig from "./config/mainnet.json";
import yargs from "yargs/yargs";
import dotenv from "dotenv";

dotenv.config();

function getOptions() {
    const options = yargs(process.argv.slice(2))
        .option("amount", {
            type: "string",
            describe: "amount of Usd1 to bridge",
            default: "10000000000000000", // 0.01 USD1
        })
        .option("dstGasLimit", {
            type: "string",
            describe: "callback gas limit on destination chain",
            default: "0", // in production, use 0, it will automatically get the default gas limit on each chain
        });
    return options.argv;
}

async function main() {
    const { amount, dstGasLimit } = getOptions() as any;
    const usd1BscAddress = "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d";
    // BSC provider
    const provider = new ethers.providers.JsonRpcProvider(
        `https://bnb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`
    );
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    const bscConfig = ccipNetworkConfig.bscMainnet;
    const ethConfig = ccipNetworkConfig.ethereumMainnet;
    const bscRouterAddress = bscConfig.router.address;
    const ethChainSelector = ethConfig.chainSelector;

    const routerContract = new ethers.Contract(bscRouterAddress, routerAbi, signer);
    const usd1Contract = new ethers.Contract(usd1BscAddress, usd1Abi, signer);

    // encode the data
    const extraArgsSelector = ethers.utils.id("CCIP EVMExtraArgsV2").slice(0, 10);
    const extraArgs = ethers.utils.defaultAbiCoder.encode(["uint256", "bool"], [dstGasLimit, true]);
    const encodedExtraArgs = extraArgsSelector + extraArgs.slice(2);

    const tokenAmounts = [
        {
            token: usd1BscAddress,
            amount: amount,
        },
    ];

    const message = {
        receiver: ethers.utils.defaultAbiCoder.encode(["address"], [signer.address]),
        data: "0x", // No data
        tokenAmounts: tokenAmounts,
        feeToken: ethers.constants.AddressZero, // use native token
        extraArgs: encodedExtraArgs,
    };

    const fees = await routerContract.getFee(ethChainSelector, message);
    console.log(`chainlink ccip fees in native token(BSC): ${ethers.utils.formatEther(fees)}`);

    let gasLimit: any;

    // check approval
    const allowance = await usd1Contract.allowance(signer.address, bscRouterAddress);
    if (allowance.lt(ethers.BigNumber.from(amount))) {
        console.log("approving...");
        gasLimit = await usd1Contract.estimateGas.approve(bscRouterAddress, amount);
        const gasLimitWithBuffer = gasLimit.mul(110).div(100);
        const txResponse = await usd1Contract.approve(bscRouterAddress, amount, {
            gasLimit: gasLimitWithBuffer,
        });
        console.log(`approved token successfully, txHash=${txResponse.hash} ✅\n`);
    }

    console.log("sending...");
    gasLimit = await routerContract.estimateGas.ccipSend(ethChainSelector, message, {
        value: fees,
    });
    const gasLimitWithBuffer = gasLimit.mul(110).div(100);

    const txResponse = await routerContract.ccipSend(ethChainSelector, message, {
        value: fees,
        gasLimit: gasLimitWithBuffer,
    });
    console.log(`sent token with ccip successfully, txHash=${txResponse.hash} ✅\n`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

// ╰─ ts-node script/typescript/bridgeUsd1Bsc2Eth.ts     ─╯
// chainlink ccip fees in native token(BSC): 0.007858834580893062
// sending...
// sent token with ccip successfully, txHash=0xc0e569ac12b2bb16c75b61b66e38b739075906002b81e739de144cb51227e329
// https://ccip.chain.link/#/side-drawer/msg/0x9aefada54c302062377ce783eed686ad63623eb4ded9ac4c60b2531c84ef6109
