import mongoose from "mongoose";

const allowedTokensSchema = new mongoose.Schema(
  {
    tokenAddress: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    tokenName: {
      type: String,
      required: true,
      trim: true,
    },
    tokenSymbol: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    tokenDecimals: {
      type: Number,
      required: true,
    },
    isAllowed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const AllowedTokens = mongoose.model("AllowedTokens", allowedTokensSchema);

export default AllowedTokens;




