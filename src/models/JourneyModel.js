import mongoose from "mongoose";
const journeySchema = new mongoose.Schema(
  {
    Driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true },
    Asset: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true },
    Journey_Type: { type: String, required: true },
    Occupancy: { type: Number, required: true },
    SOS_Status: { type: Boolean, default: false },
    boardedPassengers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Passenger", default: [] }],
  },
  { timestamps: true }
);
export default mongoose.model("Journey", journeySchema);