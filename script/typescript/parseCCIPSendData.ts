import { ethers } from "ethers";
import routerAbi from "./abi/router.json";
import yargs from "yargs/yargs";
import dotenv from "dotenv";

dotenv.config();

function getOptions() {
    const options = yargs(process.argv.slice(2)).option("calldata", {
        type: "string",
        describe: "calldata to parse",
        default:
            "0x96f4e9f900000000000000000000000000000000000000000000000045849994fc9c7b15000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000200000000000000000000000006007723dac9bb830f622bb4561e8017f021b9fb5000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000008d0d000ee44948fc98c9b98a4fa4921476f08b0d000000000000000000000000000000000000000000000000016345785d8a00000000000000000000000000000000000000000000000000000000000000000044181dcf100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000",
    });
    return options.argv;
}

async function main() {
    let options: any = getOptions();
    const calldata = options.calldata;
    const iface = new ethers.utils.Interface(routerAbi);
    const parsed = iface.parseTransaction({ data: calldata });
    const destinationChainSelector = parsed.args.destinationChainSelector.toString();
    const receiver = ethers.utils.getAddress("0x" + parsed.args.message[0].slice(-40));
    const data = parsed.args.message[1];
    const tokenAmounts = parsed.args.message[2];
    const tokenAmountsParsed = [];
    for (const tokenAmount of tokenAmounts) {
        tokenAmountsParsed.push({
            token: tokenAmount[0].toString(),
            amount: tokenAmount[1].toString(),
        });
    }

    const feeToken = parsed.args.message[3].toString();
    const extraArgs = parsed.args.message[4];

    let extraArgsParsed: {
        gasLimit: String | null;
        version: string | null;
        allowOutOfOrderExecution: boolean | null;
    } = { version: null, gasLimit: null, allowOutOfOrderExecution: null };

    if (extraArgs.startsWith("0x181dcf10")) {
        extraArgsParsed.version = "CCIP EVMExtraArgsV2";
        const extraArgsWithoutSelector = "0x" + extraArgs.slice(10);
        const [gasLimit, allowOutOfOrderExecution] = ethers.utils.defaultAbiCoder.decode(
            ["uint256", "bool"],
            extraArgsWithoutSelector
        );
        extraArgsParsed.gasLimit = gasLimit.toString();
        extraArgsParsed.allowOutOfOrderExecution = allowOutOfOrderExecution;
    } else if (extraArgs.startsWith("0x97a657c9")) {
        extraArgsParsed.version = "CCIP EVMExtraArgsV1";
        const extraArgsWithoutSelector = "0x" + extraArgs.slice(10);
        const [gasLimit] = ethers.utils.defaultAbiCoder.decode(["uint256"], extraArgsWithoutSelector);
        extraArgsParsed.gasLimit = gasLimit.toString();
    } else {
        throw new Error("Unknown extra args version!!!");
    }

    const result = {
        destinationChainSelector,
        receiver,
        data,
        tokenAmounts: tokenAmountsParsed,
        feeToken,
        extraArgs: {
            extraArgsParsed,
        },
    };

    console.log("CCIP Send Data:");
    console.log(JSON.stringify(result, null, 2));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

// ╰─ ts-node script/typescript/parseCCIPSendData.ts                                        ─╯
// CCIP Send Data:
// {
//   "destinationChainSelector": "5009297550715157269",
//   "receiver": "0x6007723DAC9Bb830f622bB4561E8017f021b9fB5",
//   "data": "0x",
//   "tokenAmounts": [
//     {
//       "token": "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d",
//       "amount": "100000000000000000"
//     }
//   ],
//   "feeToken": "0x0000000000000000000000000000000000000000",
//   "extraArgs": {
//     "extraArgsParsed": {
//       "version": "CCIP EVMExtraArgsV2",
//       "gasLimit": "0",
//       "allowOutOfOrderExecution": true
//     }
//   }
// }
