import Pools from "../modals/pools.modals.js";
import OFPL_protocol_ABI from "../abis/OFPL_protocol_ABI.json" with { type: "json" };
import { ethers } from "ethers";



let provider;
let c_ofpl;
const c_ofpl_address = process.env.OFPL_PROTOCOL_ADDRESS;
let c_ofpl_contract;
let poolContract;

export const initializePoolEventListeners = () => {
  try {
    // Check if required environment variables are set
    if (!process.env.BASE_SEPOLIA_WS_RPC_URL) {
      console.warn("⚠️  BASE_SEPOLIA_WS_RPC_URL not set. WebSocket event listeners will not be initialized.");
      return;
    }

    if (!process.env.OFPL_PROTOCOL_ADDRESS) {
      console.warn("⚠️  OFPL_PROTOCOL_ADDRESS not set. WebSocket event listeners will not be initialized.");
      return;
    }

    try {
      provider = new ethers.WebSocketProvider(process.env.BASE_SEPOLIA_WS_RPC_URL);
      c_ofpl = new ethers.Contract(process.env.OFPL_PROTOCOL_ADDRESS, OFPL_protocol_ABI, provider);


      provider.on("error", (error) => {
        console.error("❌ WebSocket provider error:", error.message);
        if (error.message.includes("401") || error.message.includes("Unauthorized")) {
          console.error("⚠️  WebSocket authentication failed. Please check your BASE_SEPOLIA_WS_RPC_URL API key.");
        }
      });
      provider.websocket.on("close", (code, reason) => {
        console.warn(`⚠️  WebSocket connection closed. Code: ${code}, Reason: ${reason || "Unknown"}`);
      });


      c_ofpl.on("OFPL__PoolCreated", async (...args) => {
        try {
          // In ethers.js v6, the event object is the last argument
          const event = args[args.length - 1];
          
          // Extract poolId from event args (the struct is indexed/hashed, so we can't get it from the event)
          // poolId is the second argument (index 1)
          const poolId = event.args[1] || args[1];
          const createdAt = event.args[2] || args[2];
          
          console.log(`📢 Pool created event received - poolId: ${poolId}`);
          
          // Since the struct is indexed (hashed), we need to query the contract to get the pool data
          // Use getPoolInfo function to retrieve the full pool struct
          const poolData = await c_ofpl.getPoolInfo(poolId);
          
          console.log("Pool data from contract:", poolData);
          
          // Extract pool struct fields
          const {
            lender,
            loanToken,
            collateralToken,
            minLoanSize,
            poolBalance,
            maxLoanRatio,
            auctionLength,
            interestRate,
            outStandingLoans
          } = poolData;
          
          // Validate required fields exist
          if (!lender || !loanToken || !collateralToken || minLoanSize === undefined) {
            throw new Error("Required pool fields are missing from contract query");
          }
          
          // Convert BigInt values to Number (values are already BigInt from ethers)
          const maxLoanRatioNum = Number(maxLoanRatio);
          const auctionLengthNum = Number(auctionLength);
          const interestRateNum = Number(interestRate);
          const outstandingLoansNum = Number(outStandingLoans);
          
          // For string fields: addresses are already strings, BigInt values need conversion
          const minLoanSizeStr = String(minLoanSize);
          const poolBalanceStr = String(poolBalance);
          const poolIdStr = String(poolId);
          
          const newPool = new Pools({
            lender: String(lender),
            loanToken: String(loanToken),
            collateralToken: String(collateralToken),
            minLoanSize: minLoanSizeStr,
            poolBalance: poolBalanceStr,
            maxLoanRatio: maxLoanRatioNum,
            auctionLength: auctionLengthNum,
            interestRate: interestRateNum,
            outstandingLoans: outstandingLoansNum, // Note: schema uses 'outstandingLoans' (lowercase 's')
            poolId: poolIdStr,
            loans: [],
          });
          
          await newPool.save();
          console.log("✅ Pool created:", newPool.poolId);
        } catch (error) {
          console.error("❌ Error processing pool creation:", error.message);
          console.error("Error stack:", error.stack);
        }
      });

      c_ofpl.on("OFPL__PoolUpdated",async (poolId,updatedAt) => {
        try {
         poolContract = new ethers.Contract(c_ofpl_address,OFPL_protocol_ABI,provider);
         const poolInfo = await poolContract.getPoolInfo(poolId);
         const {
          lender,
          loanToken,
          collateralToken,
          minLoanSize,
          poolBalance,
          maxLoanRatio,
          auctionLength,
          interestRate,
          outStandingLoans
        } = poolInfo;

        if(!lender || !loanToken || !collateralToken || minLoanSize === undefined) {
          throw new Error("Required pool fields are missing from contract query");
        }
        const maxLoanRatioNum = Number(maxLoanRatio);
        const auctionLengthNum = Number(auctionLength);
        const interestRateNum = Number(interestRate);
        const outstandingLoansNum = Number(outStandingLoans);

        const minLoanSizeStr = String(minLoanSize);
        const poolBalanceStr = String(poolBalance);
        const poolIdStr = String(poolId);

        const updatedPool = await Pools.findOneAndUpdate(
          { poolId: poolIdStr },
          {
            loanToken: String(loanToken),
            collateralToken: String(collateralToken),
            minLoanSize: minLoanSizeStr,
            poolBalance: poolBalanceStr,
            maxLoanRatio: maxLoanRatioNum,
            auctionLength: auctionLengthNum,
            interestRate: interestRateNum,
            outstandingLoans: outstandingLoansNum,
            outStandingLoans: outstandingLoansNum,
            updatedAt: updatedAt,
          },
        );
        console.log("✅ Pool updated:", updatedPool.poolId);
        } catch (error) {
          console.error("❌ Error processing pool update:", error.message);
          // console.error("Error stack:", error.stack);
        }
      })
      

    } catch (error) {
      console.error("❌ Failed to create WebSocket provider:", error.message);
      throw error;
    }

  } catch (error) {
    console.error("❌ Failed to initialize pool event listeners:", error.message);
    // Don't throw error - allow server to continue running
  }
}

export const closePoolEventListeners = () => {
  try {
    provider.removeAllListeners();
    c_ofpl.removeAllListeners();
  } catch (error) {
    console.error("❌ Failed to close pool event listeners:", error.message);
    throw error;
  }
}