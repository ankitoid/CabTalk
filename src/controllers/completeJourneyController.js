import Journey from "../models/JourneyModel.js";
import EndJourney from "../models/completeJourneyModel.js";
import Asset from "../models/assetModel.js";
import Driver from "../models/driverModel.js";

export const endJourney = async (req, res) => {
  try {
    const { vehicleNumber } = req.body;
    if (!vehicleNumber) {
      return res.status(400).json({ message: "vehicleNumber is required." });
    }
    const driver = await Driver.findOne({ vehicleNumber });
    if (!driver) {
      return res
        .status(404)
        .json({
          message: "Driver with the provided vehicle number not found.",
        });
    }
    const journey = await Journey.findOne({ Driver: driver._id });
    if (!journey) {
      return res
        .status(404)
        .json({ message: "No active journey found for this vehicle." });
    }
    const endedJourney = new EndJourney({
      Driver: journey.Driver,
      Asset: journey.Asset,
      Journey_Type: journey.Journey_Type,
      Occupancy: journey.Occupancy,
    });

    await endedJourney.save();
    await Journey.findByIdAndDelete(journey._id);

    const updatedAsset = await Asset.findById(journey.Asset);
    if (updatedAsset) {
      updatedAsset.isActive = false;
      await updatedAsset.save();
    }

    if (!updatedAsset) {
      return res.status(404).json({ message: "Associated asset not found." });
    }
    return res.status(200).json({
      message: "Journey ended successfully.",
      endedJourney,
    });
  } catch (error) {
    console.error("Error in endJourney:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const getEndedJourneys = async (req, res) => {
  try {
    const endedJourneys = await EndJourney.find()
      .populate({
        path: "Driver",
        select: "vehicleNumber",
      })
      .sort({ endedAt: -1 });

    if (!endedJourneys || endedJourneys.length === 0) {
      return res.status(200).json({
        message: "No ended journeys found.",
        data: [],
      });
    }

    const formattedData = endedJourneys
      .filter((journey) => journey.Driver)
      .map((journey) => ({
        vehicleNumber: journey.Driver.vehicleNumber,
        Journey_Type: journey.Journey_Type,
        Occupancy: journey.Occupancy,
        endedAt: journey.endedAt,
      }));

    return res.status(200).json({
      message: "Ended journeys retrieved successfully.",
      data: formattedData,
    });
  } catch (error) {
    console.error("Error in getEndedJourneys:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
