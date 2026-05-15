{
  "name": "LocationLog",
  "type": "object",
  "properties": {
    "vehicle_id": {
      "type": "string",
      "description": "Vehicle ID"
    },
    "trip_id": {
      "type": "string",
      "description": "Trip ID"
    },
    "latitude": {
      "type": "number"
    },
    "longitude": {
      "type": "number"
    },
    "speed": {
      "type": "number"
    },
    "heading": {
      "type": "number"
    },
    "accuracy": {
      "type": "number"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": [
    "vehicle_id",
    "latitude",
    "longitude"
  ]
}