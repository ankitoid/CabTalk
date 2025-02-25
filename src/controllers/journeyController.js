import mongoose from "mongoose";
import Journey from "../models/JourneyModel.js";
import Asset from "../models/assetModel.js";
import Driver from "../models/driverModel.js";
import Passenger from "../models/Passenger.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

export const updateOccupancyByDriver = asyncHandler(async (req, res) => {
  const { driverPhone, passengerCode, action } = req.body;
  if (!driverPhone || !action || (action === "yes" && !passengerCode)) {
    return res.status(400).json({
      message: "driverPhone and action are required. Passenger code is required when boarding.",
    });
  }
  const driver = await Driver.findOne({ phoneNumber: driverPhone });
  if (!driver) {
    return res.status(404).json({ message: "No driver found with this phone number." });
  }
  const journey = await Journey.findOne({ Driver: driver._id }).populate("Asset");
  if (!journey) {
    return res.status(404).json({ message: "No active journey found for this driver." });
  }
  if (action === "no") {
    return res.status(200).json({ message: "Passenger not available. No change in occupancy." });
  }
  const passenger = await Passenger.findOne({ Employee_ID: { $regex: passengerCode + "$" } });
  if (!passenger) {
    return res.status(404).json({ message: "The provided passenger code is incorrect or does not exist." });
  }
  if (!journey.Asset.passengers.map((id) => id.toString()).includes(passenger._id.toString())) {
    return res.status(400).json({
      message: "This passenger is not part of the assigned vehicle for today’s trip.",
    });
  }
  if (!journey.boardedPassengers) {
    journey.boardedPassengers = [];
  }
  if (journey.boardedPassengers.includes(passenger._id)) {
    return res.status(400).json({ message: "This passenger has already boarded." });
  }
  if (journey.Asset.capacity !== undefined && journey.Occupancy + 1 > journey.Asset.capacity) {
    return res.status(400).json({ message: "Cannot board. The vehicle has reached its full capacity." });
  }
  journey.Occupancy += 1;
  journey.boardedPassengers.push(passenger._id);
  await journey.save();
  return res.status(200).json({ message: "Passenger status updated successfully.", journey });
});

export const createJourney = async (req, res) => {
  try {
    const { Journey_Type, vehicleNumber } = req.body;
    if (!Journey_Type || !vehicleNumber) {
      return res.status(400).json({ message: "Journey_Type and vehicleNumber are required." }); }
    const driver = await Driver.findOne({ vehicleNumber });
    if (!driver) {
      return res.status(404).json({ message: "No driver found with this vehicle number." });}
    const asset = await Asset.findOne({ driver: driver._id }).populate("passengers");
    if (!asset) {
      return res.status(404).json({ message: "No assigned vehicle found for this driver." });}
    const existingJourney = await Journey.findOne({
      Driver: driver._id,
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
    });
    if (existingJourney) {
      return res.status(400).json({ message: "A journey for this vehicle has already been created today." }); }
    const newJourney = new Journey({
      Driver: driver._id,
      Asset: asset._id,
      Journey_Type,
      Occupancy: 0,
      SOS_Status: false,
    });
    await newJourney.save();
    asset.isActive = true;
    await asset.save();
    return res.status(201).json({
      message: "Journey created successfully.",
      newJourney,
      updatedAsset: asset,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });}
};

export const getJourneys = async (req, res) => {
  try {
    const journeys = await Journey.find()
      .populate("Driver")
      .populate({
        path: "Asset",
        populate: { path: "passengers", model: "Passenger" },
      });
    if (!journeys || journeys.length === 0) {
      return res.status(404).json({ message: "No journeys found." });
    }
    return res.status(200).json(journeys);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getJourneyById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid journey ID." }); }
    const journey = await Journey.findById(id)
      .populate("Driver")
      .populate({
        path: "Asset",
        populate: { path: "passengers", model: "Passenger" },
      });
    if (!journey) {
      return res.status(404).json({ message: "Journey not found." });}
    return res.status(200).json(journey);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateJourney = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid journey ID." });}
    const updateData = req.body;
    if (updateData.Driver && !mongoose.isValidObjectId(updateData.Driver)) {
      return res.status(400).json({ message: "Invalid Driver ID." });}
    if (updateData.Asset && !mongoose.isValidObjectId(updateData.Asset)) {
      return res.status(400).json({ message: "Invalid Asset ID." });}
    if (updateData.Occupancy !== undefined) {
      const currentJourney = await Journey.findById(id).populate("Asset");
      if (currentJourney.Asset.capacity && updateData.Occupancy > currentJourney.Asset.capacity) {
        return res.status(400).json({ message: "Occupancy exceeds asset capacity." });
      }}
    const updatedJourney = await Journey.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedJourney) {
      return res.status(404).json({ message: "Journey not found." });}
    return res.status(200).json(updatedJourney);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateSOSStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { SOS_Status } = req.body;
    if (typeof SOS_Status !== "boolean") {
      return res.status(400).json({ message: "SOS_Status must be a boolean value." });}
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid journey ID." });}
    const journey = await Journey.findById(id);
    if (!journey) {
      return res.status(404).json({ message: "Journey not found." });}
    journey.SOS_Status = SOS_Status;
    await journey.save();
    return res.status(200).json({ message: "SOS status updated successfully.", journey });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getPassengersByDriverPhone = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.query;
  if (!phoneNumber) {
    return res.status(400).json("Driver phone number is required.");
  }
  const driver = await Driver.findOne({ phoneNumber });
  if (!driver) {
    return res.status(404).json("Driver not found.");
  }
  const asset = await Asset.findOne({ driver: driver._id })
    .populate("passengers", "Employee_Name Employee_PhoneNumber Employee_Address Employee_ID");
  if (!asset) {
    return res.status(404).json("No cab (asset) assigned to this driver.");
  }
  const passengerList = asset.passengers;
  let formattedMessage = "Passengers assigned to your cab:\n";
  passengerList.forEach((passenger, index) => {
    formattedMessage += `${index + 1}. Name: ${passenger.Employee_Name}, Phone: ${passenger.Employee_PhoneNumber}, Address: ${passenger.Employee_Address}\n`;
  });
  return res.status(200).json({ formattedMessage });
});
