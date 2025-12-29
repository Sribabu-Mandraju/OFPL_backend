import AllowedTokens from "../modals/tokens.modals.js";
import OFPL_protocol_ABI from "../abis/OFPL_protocol_ABI.json" with { type: "json" };
import FaucetToken from "../abis/FaucetToken.json" with { type: "json" };
import { ethers } from "ethers";

let provider;
let providerForFaucetToken;
let c_ofpl;

export const initializeTokenEventListeners = () => {
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

    if (!process.env.BASE_SEPOLIA_RPC_URL) {
      console.warn("⚠️  BASE_SEPOLIA_RPC_URL not set. WebSocket event listeners will not be initialized.");
      return;
    }

    // Initialize providers
    providerForFaucetToken = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
    
    // Create WebSocket provider with error handling
    try {
      provider = new ethers.WebSocketProvider(process.env.BASE_SEPOLIA_WS_RPC_URL);

      // Handle WebSocket connection errors BEFORE setting up contract
      provider.on("error", (error) => {
        console.error("❌ WebSocket provider error:", error.message);
        if (error.message.includes("401") || error.message.includes("Unauthorized")) {
          console.error("⚠️  WebSocket authentication failed. Please check your BASE_SEPOLIA_WS_RPC_URL API key.");
        }
      });

      // Handle WebSocket close events
      if (provider.websocket) {
        provider.websocket.on("close", (code, reason) => {
          console.warn(`⚠️  WebSocket connection closed. Code: ${code}, Reason: ${reason || "Unknown"}`);
        });

        provider.websocket.on("error", (error) => {
          console.error("❌ WebSocket error:", error.message);
          if (error.message && (error.message.includes("401") || error.message.includes("Unauthorized"))) {
            console.error("⚠️  WebSocket authentication failed. Please check your BASE_SEPOLIA_WS_RPC_URL API key.");
          }
        });
      }
    } catch (error) {
      console.error("❌ Failed to create WebSocket provider:", error.message);
      throw error;
    }

    // Initialize contract
    c_ofpl = new ethers.Contract(
      process.env.OFPL_PROTOCOL_ADDRESS,
      OFPL_protocol_ABI,
      provider
    );

    // Set up event listener
    c_ofpl.on("OFPL__TokenAllowListUpdated", async (tokenAddress, isAllowed, updatedAt) => {
      try {
        console.log(`📢 Token allow list updated: ${tokenAddress}, isAllowed: ${isAllowed}`);
        
        const token = await AllowedTokens.findOne({ tokenAddress });
        
        if (!token) {
          // Create new token entry
          const tokenContract = new ethers.Contract(
            tokenAddress,
            FaucetToken,
            providerForFaucetToken // Use JsonRpcProvider for reading contract data
          );
          
          const tokenName = await tokenContract.name();
          const tokenSymbol = await tokenContract.symbol();
          const tokenDecimalsRaw = await tokenContract.decimals();
          const tokenDecimals = Number(tokenDecimalsRaw);

          const allowedToken = new AllowedTokens({
            tokenAddress,
            tokenName,
            tokenSymbol,
            tokenDecimals,
            isAllowed,
          });
          
          await allowedToken.save();
          console.log(`✅ New token added: ${tokenName} (${tokenSymbol})`);
        } else {
          // Update existing token
          token.isAllowed = isAllowed;
          await token.save();
          console.log(`✅ Token updated: ${token.tokenName} (${token.tokenSymbol})`);
        }
      } catch (error) {
        console.error("❌ Error processing token allow list update:", error.message);
      }
    });

    // Wait a bit to check if connection is successful
    setTimeout(() => {
      if (provider.websocket.readyState === 1) {
        console.log("✅ Token event listeners initialized and WebSocket connected");
      } else {
        console.warn("⚠️  WebSocket connection may not be established. Event listeners may not work.");
      }
    }, 2000);

  } catch (error) {
    console.error("❌ Failed to initialize token event listeners:", error.message);
    if (error.message.includes("401") || error.message.includes("Unauthorized")) {
      console.error("⚠️  WebSocket authentication failed. Please check your BASE_SEPOLIA_WS_RPC_URL.");
      console.error("⚠️  The server will continue running, but event listeners will not work.");
    } else {
      console.error("⚠️  The server will continue running, but event listeners will not work.");
    }
    // Don't throw error - allow server to continue running
  }
};

export const closeEventListeners = async () => {
  try {
    if (provider) {
      await provider.destroy();
      console.log("✅ WebSocket provider closed");
    }
  } catch (error) {
    console.error("❌ Error closing event listeners:", error.message);
  }
};

