{
  "name": "Geofence",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the geofenced area"
    },
    "description": {
      "type": "string",
      "description": "Description / purpose of this zone"
    },
    "center_latitude": {
      "type": "number",
      "description": "Latitude of the zone center"
    },
    "center_longitude": {
      "type": "number",
      "description": "Longitude of the zone center"
    },
    "radius_meters": {
      "type": "number",
      "description": "Radius of the circular geofence in meters",
      "default": 500
    },
    "assigned_vehicle_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Vehicle IDs that must stay inside this zone"
    },
    "alert_on_exit": {
      "type": "boolean",
      "default": true,
      "description": "Trigger alert when a vehicle exits this zone"
    },
    "alert_on_enter": {
      "type": "boolean",
      "default": false,
      "description": "Trigger alert when a vehicle enters this zone (destination arrival)"
    },
    "is_active": {
      "type": "boolean",
      "default": true
    }
  },
  "required": [
    "name",
    "center_latitude",
    "center_longitude",
    "radius_meters"
  ]
}