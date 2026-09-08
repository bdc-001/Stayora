import mongoose from "mongoose";
import { Trip } from "../../../shared/itinerary";
export type StoredTrip = Omit<Trip, "_id"> & {
  userId: string;
  preparingItemId?: string;
  approvals?: unknown[];
};
const schema = new mongoose.Schema<StoredTrip>(
  {
    userId: { type: String, required: true, index: true },
    revision: { type: Number, required: true, default: 1 },
    status: { type: String, required: true, default: "draft" },
    messages: {
      type: [
        new mongoose.Schema(
          {
            role: { type: String, enum: ["user", "assistant"], required: true },
            content: { type: String, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    proposal: { type: mongoose.Schema.Types.Mixed, required: true },
    quoteExpiresAt: { type: String, required: true },
    approvals: { type: [mongoose.Schema.Types.Mixed], default: [] },
    approvedRevision: Number,
    preparingItemId: String,
    approvedAt: String,
    approvedTotal: Number,
  },
  { timestamps: true, optimisticConcurrency: true },
);
schema.index({ userId: 1, updatedAt: -1 });
export default mongoose.model<StoredTrip>("Trip", schema);
