import mongoose from "mongoose";

const loanSchema = new mongoose.Schema(
  {
    poolId: {
      type: String,
      required: true,
      trim: true,
    },
    loanId: {
      type: String,
      required: true,
      trim: true,
    },
    lender: {
      type: String,
      required: true,
      trim: true,
    },

    borrower: {
      type: String,
      required: true,
      trim: true,
    },

    loanToken: {
      type: String,
      required: true,
      trim: true,
    },

    collateralToken: {
      type: String,
      required: true,
      trim: true,
    },

    debt: {
      type: String,
      required: true,
    },

    collateral: {
      type: String,
      required: true,
    },

    interestRate: {
      type: Number,
      required: true,
    },

    auctionStartTimeStamp: {
      type: Number,
      required: true,
    },

    loanStartTimeStamp: {
      type: Number,
      required: true,
    },

    auctionLength: {
      type: Number,
      required: true,
    },

    isLoanPaid: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Loans = mongoose.model("Loans", loanSchema);

export default Loans;
