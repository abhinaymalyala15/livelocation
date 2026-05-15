{
  "name": "Vehicle",
  "type": "object",
  "properties": {
    "vehicle_name": {
      "type": "string",
      "description": "Display name of the vehicle"
    },
    "vehicle_unique_id": {
      "type": "string",
      "description": "Unique identifier for the vehicle (plate number or fleet ID)"
    },
    "driver_email": {
      "type": "string",
      "description": "Email of the assigned driver"
    },
    "driver_name": {
      "type": "string",
      "description": "Name of the assigned driver"
    },
    "status": {
      "type": "string",
      "enum": [
        "available",
        "on_trip",
        "offline",
        "maintenance"
      ],
      "default": "available",
      "description": "Current vehicle status"
    },
    "current_latitude": {
      "type": "number",
      "description": "Current latitude"
    },
    "current_longitude": {
      "type": "number",
      "description": "Current longitude"
    },
    "current_speed": {
      "type": "number",
      "description": "Current speed in km/h"
    },
    "heading": {
      "type": "number",
      "description": "Direction heading in degrees"
    },
    "accuracy": {
      "type": "number",
      "description": "GPS accuracy in meters"
    },
    "last_location_update": {
      "type": "string",
      "format": "date-time",
      "description": "Timestamp of last location update"
    },
    "current_trip_id": {
      "type": "string",
      "description": "ID of the current active trip"
    },
    "current_destination": {
      "type": "string",
      "description": "Current trip destination"
    }
  },
  "required": [
    "vehicle_name",
    "vehicle_unique_id"
  ]
}