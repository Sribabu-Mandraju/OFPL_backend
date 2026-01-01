import mongoose from "mongoose";

const poolSchema = new mongoose.Schema(
  {
    poolId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    lender: {
      type: String, 
      required: true,
      trim: true,
    },

    collateralToken: {
      type: String, 
      required: true,
      trim: true,
    },

    loanToken: {
      type: String, 
      required: true,
      trim: true,
    },

    minLoanSize: {
      type: String, 
      required: true,
    },

    poolBalance: {
      type: String, 
      required: true,
      default: "0",
    },

    maxLoanRatio: {
      type: Number, 
      required: true,
    },

    auctionLength: {
      type: Number, 
      required: true,
    },

    interestRate: {
      type: Number, 
      required: true,
    },

    outstandingLoans: {
      type: Number,
      default: 0,
    },

    loans: [
      {
        type: String,
        ref: "Loans",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Pools = mongoose.model("Pools", poolSchema);

export default Pools;
