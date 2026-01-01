import Pools from "../modals/pools.modals.js";
import OFPL_protocol_ABI from "../abis/OFPL_protocol_ABI.json" with { type: "json" };
import { ethers } from "ethers";


let provider;
let c_ofpl;

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


      c_ofpl.on("OFPL__PoolCreated", async (pool, poolId, createdAt) => {
        try {
          const {lender, loanToken, collateralToken, minLoanSize, poolBalance, maxLoanRatio, auctionLength, interestRate, outStandingLoans} = pool;
          
          const newPool = new Pools({
            lender: lender.toString(),
            loanToken: loanToken.toString(),
            collateralToken: collateralToken.toString(),
            minLoanSize: minLoanSize.toString(),
            poolBalance: poolBalance.toString(),
            maxLoanRatio: Number(maxLoanRatio),
            auctionLength: Number(auctionLength),
            interestRate: Number(interestRate),
            outstandingLoans: Number(outStandingLoans), // Note: schema uses 'outstandingLoans' (lowercase 's')
            poolId: poolId.toString(), // Convert bytes32 to string
            createdAt: createdAt,
            updatedAt: createdAt,
            loans: [],
          });
          
          await newPool.save();
          console.log("✅ Pool created:", newPool.poolId);
        } catch (error) {
          console.error("❌ Error processing pool creation:", error.message);
        }
      });
      

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