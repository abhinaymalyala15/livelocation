// Trip entity
{
  "name": "Trip",
  "type": "object",
  "properties": {
    "vehicle_id": {
      "type": "string",
      "description": "ID of the vehicle"
    },
    "vehicle_name": {
      "type": "string",
      "description": "Name of the vehicle"
    },
    "driver_email": {
      "type": "string",
      "description": "Email of the driver"
    },
    "driver_name": {
      "type": "string",
      "description": "Name of the driver"
    },
    "destination": {
      "type": "string",
      "description": "Trip destination"
    },
    "start_time": {
      "type": "string",
      "format": "date-time",
      "description": "Trip start time"
    },
    "end_time": {
      "type": "string",
      "format": "date-time",
      "description": "Trip end time"
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "completed",
        "cancelled"
      ],
      "default": "active",
      "description": "Trip status"
    },
    "start_latitude": {
      "type": "number"
    },
    "start_longitude": {
      "type": "number"
    },
    "end_latitude": {
      "type": "number"
    },
    "end_longitude": {
      "type": "number"
    },
    "distance_km": {
      "type": "number",
      "description": "Total distance traveled in km"
    }
  },
  "required": [
    "vehicle_id",
    "destination"
  ]
}