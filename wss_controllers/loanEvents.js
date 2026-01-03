import Loans from "../modals/loans.modals.js";
import OFPL_protocol_ABI from "../abis/OFPL_protocol_ABI.json" with { type: "json" };
import { ethers } from "ethers";
import Pools from "../modals/pools.modals.js";

let provider;
let c_ofpl;
const c_ofpl_address = process.env.OFPL_PROTOCOL_ADDRESS;

export const initializeLoanEventListeners = () => {
  try {
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

      c_ofpl.on("OFPL__LoanCreatedSuccessfully", async (...args) => {
        try {
          const event = args[args.length - 1];

          const poolId = event.args.poolId || event.args[1] || args[1];
          const loanId = event.args.loanId !== undefined ? event.args.loanId : (event.args[2] !== undefined ? event.args[2] : args[2]);
          const createdAt = event.args.createdAt || event.args[3] || args[3];
          
          console.log(`📢 Loan created event received - poolId: ${poolId}, loanId: ${loanId}`);
          console.log("Event args:", event.args);
          
          if (poolId === undefined || poolId === null || loanId === undefined || loanId === null) {
            console.error("❌ Missing required parameters - poolId or loanId");
            console.log("poolId:", poolId, "loanId:", loanId);
            return;
          }
          
          const poolIdStr = String(poolId);
          const loanIdStr = String(loanId);
          const createdAtNum = createdAt ? Number(createdAt) : null;
          
          const pool = await Pools.findOne({ poolId: poolIdStr });
          if (!pool) {
            console.warn("⚠️  Pool not found in database");
            return;
          }
          
          const loanInfo = await c_ofpl.getLoanInfo(loanId);
          
          const {
            lender,
            borrower,
            loanToken,
            collateralToken,
            debt,
            collateral,
            interestRate,
            auctionStartTimeStamp,
            loanStartTimeStamp,
            auctionLength
          } = loanInfo;

          if (!lender || !borrower || !loanToken || !collateralToken || debt === undefined) {
            throw new Error("Required loan fields are missing from contract query");
          }

          const interestRateNum = Number(interestRate);
          const auctionStartTimeStampNum = Number(auctionStartTimeStamp);
          const loanStartTimeStampNum = Number(loanStartTimeStamp);
          const auctionLengthNum = Number(auctionLength);

          const debtStr = String(debt);
          const collateralStr = String(collateral);

          
          const newLoan = new Loans({
            loanId: loanIdStr,
            poolId: poolIdStr,
            lender: String(lender),
            borrower: String(borrower),
            loanToken: String(loanToken),
            collateralToken: String(collateralToken),
            debt: debtStr,
            collateral: collateralStr,
            interestRate: interestRateNum,
            auctionStartTimeStamp: auctionStartTimeStampNum,
            loanStartTimeStamp: loanStartTimeStampNum,
            auctionLength: auctionLengthNum,
            createdAt: createdAtNum,
          });
          
          await newLoan.save();
          console.log("✅ Loan document created in Loans collection:", newLoan.loanId);
          
          if (!pool.loans.includes(loanIdStr)) {
            pool.loans.push(loanIdStr);
            await pool.save();
            console.log("✅ LoanId pushed to pool's loans array:", loanIdStr);
          } else {
            console.log("ℹ️  LoanId already exists in pool's loans array:", loanIdStr);
          }
        } catch (error) {
          console.error("❌ Error processing loan creation:", error.message);
          console.error("Error stack:", error.stack);
        }
      });



      c_ofpl.on("OFPL__LaonIsUpdated", async (...args) => {
        try {
          const event = args[args.length - 1];
          const loanId = event.args.loanId || event.args[0] || args[0];
          const updatedAt = event.args.updatedAt || event.args[1] || args[1];
          
          const loanInfo = await c_ofpl.getLoanInfo(loanId);
          const {
            lender,
            borrower,
            loanToken,
            collateralToken,
            debt,
            collateral,
            interestRate,
            auctionStartTimeStamp,
            loanStartTimeStamp,
            auctionLength
          } = loanInfo;

          if (!lender || !borrower || !loanToken || !collateralToken || debt === undefined) {
            throw new Error("Required loan fields are missing from contract query");
          }

          const interestRateNum = Number(interestRate);
          const auctionStartTimeStampNum = Number(auctionStartTimeStamp);
          const loanStartTimeStampNum = Number(loanStartTimeStamp);
          const auctionLengthNum = Number(auctionLength);

          const debtStr = String(debt);
          const collateralStr = String(collateral);

          const updatedLoan = await Loans.findOneAndUpdate(
            { loanId: String(loanId) },
            {
              debt: debtStr,
              collateral: collateralStr,
              interestRate: interestRateNum,
              auctionStartTimeStamp: auctionStartTimeStampNum,
              loanStartTimeStamp: loanStartTimeStampNum,
              auctionLength: auctionLengthNum,
              
            },
            { new: true }
          );
          console.log("✅ Loan updated:", updatedLoan.loanId);
        } catch (error) {
          console.error("❌ Error processing loan update:", error.message);
        }
      })


      c_ofpl.on("OFPL__LoanLenderChanged", async (...args) => {
        try {
          const event = args[args.length - 1];
          const loanId = event.args.loanId || event.args[0] || args[0];
          const oldPoolId = event.args.oldPoolId || event.args[1] || args[1];
          const newPoolId = event.args.newPoolId || event.args[2] || args[2];
          
          const loanIdStr = String(loanId);
          const oldPoolIdStr = String(oldPoolId);
          const newPoolIdStr = String(newPoolId);
          
          console.log(`📢 Loan lender changed - loanId: ${loanIdStr}, oldPoolId: ${oldPoolIdStr}, newPoolId: ${newPoolIdStr}`);
          
          
          const oldPool = await Pools.findOne({ poolId: oldPoolIdStr });
          if (oldPool) {
            if (oldPool.loans.includes(loanIdStr)) {
              oldPool.loans.pull(loanIdStr); 
              await oldPool.save();
              console.log("✅ LoanId removed from old pool's loans array:", loanIdStr);
            } else {
              console.log("ℹ️  LoanId not found in old pool's loans array:", loanIdStr);
            }
          } else {
            console.warn("⚠️  Old pool not found in database:", oldPoolIdStr);
          }

          
          const newPool = await Pools.findOne({ poolId: newPoolIdStr });
          if (newPool) {
            if (!newPool.loans.includes(loanIdStr)) {
              newPool.loans.push(loanIdStr);
              await newPool.save();
              console.log("✅ LoanId added to new pool's loans array:", loanIdStr);
            } else {
              console.log("ℹ️  LoanId already exists in new pool's loans array:", loanIdStr);
            }
          } else {
            console.warn("⚠️  New pool not found in database:", newPoolIdStr);
          }
          
          
          const updatedLoan = await Loans.findOneAndUpdate(
            { loanId: loanIdStr },
            { poolId: newPoolIdStr },
            { new: true }
          );
          
          if (updatedLoan) {
            console.log("✅ Loan document poolId updated:", loanIdStr);
          } else {
            console.warn("⚠️  Loan document not found:", loanIdStr);
          }
        } catch (error) {
          console.error("❌ Error processing loan lender changed:", error.message);
          console.error("Error stack:", error.stack);
        }
      })


    } catch (error) {
      console.error("❌ Failed to create WebSocket provider:", error.message);
      throw error;
    }

  } catch (error) {
    console.error("❌ Failed to initialize loan event listeners:", error.message);
  }
}

export const closeLoanEventListeners = () => {
  try {
    provider.removeAllListeners();
    c_ofpl.removeAllListeners();
  } catch (error) {
    console.error("❌ Failed to close loan event listeners:", error.message);
    throw error;
  }
}

