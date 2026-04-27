const mongoose = require("mongoose");

const normalizePhoneNumber = require("../utils/normalizePhoneNumber");

const messageHistorySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    batchId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    recipientName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedPhoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4096,
    },
    source: {
      type: String,
      enum: ["manual", "bulk"],
      default: "manual",
    },
    status: {
      type: String,
      enum: ["queued", "pending", "sent", "failed"],
      default: "queued",
      index: true,
    },
    metaMessageId: {
      type: String,
      trim: true,
      default: "",
    },
    metaResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    errorMessage: {
      type: String,
      trim: true,
      default: "",
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

messageHistorySchema.index({ owner: 1, createdAt: -1 });

messageHistorySchema.pre("validate", function normalizeMessagePhone() {
  this.normalizedPhoneNumber = normalizePhoneNumber(this.phoneNumber);
});

module.exports = mongoose.model("MessageHistory", messageHistorySchema);
