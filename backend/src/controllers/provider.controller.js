const fast2smsService = require("../services/fast2sms.service");
const asyncHandler = require("../utils/asyncHandler");

const getWalletBalance = asyncHandler(async (req, res) => {
    const result = await fast2smsService.getWalletBalance();
    res.status(200).json({ success: true, data: result });
});

const getBlockedUsers = asyncHandler(async (req, res) => {
    const result = await fast2smsService.getBlockedUsers();
    res.status(200).json({ success: true, data: result });
});

const blockUser = asyncHandler(async (req, res) => {
    const { number } = req.body;
    const result = await fast2smsService.blockUser(number);
    res.status(200).json({ success: true, data: result });
});

const unblockUser = asyncHandler(async (req, res) => {
    const { number } = req.params;
    const result = await fast2smsService.unblockUser(number);
    res.status(200).json({ success: true, data: result });
});

module.exports = {
    getWalletBalance,
    getBlockedUsers,
    blockUser,
    unblockUser,
};
