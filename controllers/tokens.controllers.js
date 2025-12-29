import AllowedTokens from "../modals/tokens.modals.js";
import dotenv from "dotenv";
import FaucetToken from "../abis/FaucetToken.json" with { type: "json" };
import { ethers } from "ethers";

dotenv.config();


const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);


export const addAllowedToken = async (req, res) => {
    try {
        const { tokenAddress } = req.body;
        if (!tokenAddress) {
            return res.status(400).json({ message: "Token address is required" });
        }
        const tokenContract = new ethers.Contract(tokenAddress, FaucetToken, provider);
        const tokenName = await tokenContract.name();
        const tokenSymbol = await tokenContract.symbol();
        const tokenDecimalsRaw = await tokenContract.decimals();
        const tokenDecimals = Number(tokenDecimalsRaw);

        const allowedToken = new AllowedTokens({
            tokenAddress,
            tokenName,
            tokenSymbol,
            tokenDecimals,
        });
        await allowedToken.save();
        res.status(201).json({ message: "Token added successfully", allowedToken });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }   
}


export const deleteAllowedToken = async (req, res) => {
    try {
        const { tokenAddress } = req.body;
        if (!tokenAddress) {
            return res.status(400).json({ message: "Token address is required" });
        }
        const allowedToken = await AllowedTokens.findOneAndDelete({ tokenAddress });
        if (!allowedToken) {
            return res.status(404).json({ message: "Token not found" });
        }
        res.status(200).json({ message: "Token deleted successfully", allowedToken });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}


export const getAllowedTokens = async (req, res) => {
    try {
        const allowedTokens = await AllowedTokens.find();
        res.status(200).json({ allowedTokens });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getAllowedToken = async (req, res) => {
    try {
        const { tokenAddress } = req.params;
        if (!tokenAddress) {
            return res.status(400).json({ message: "Token address is required" });
        }
        const allowedToken = await AllowedTokens.findOne({ tokenAddress });
        if (!allowedToken) {
            return res.status(404).json({ message: "Token not found" });
        }
        res.status(200).json({ allowedToken });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}