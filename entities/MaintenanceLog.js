{
  "name": "MaintenanceLog",
  "type": "object",
  "properties": {
    "vehicle_id": {
      "type": "string",
      "description": "ID of the vehicle"
    },
    "vehicle_name": {
      "type": "string"
    },
    "type": {
      "type": "string",
      "enum": [
        "oil_change",
        "tire_rotation",
        "brake_service",
        "engine_repair",
        "inspection",
        "other"
      ],
      "description": "Type of maintenance"
    },
    "description": {
      "type": "string",
      "description": "Details of the repair/service"
    },
    "service_date": {
      "type": "string",
      "format": "date-time",
      "description": "Date the service was performed"
    },
    "mileage_at_service": {
      "type": "number",
      "description": "Odometer reading in km at time of service"
    },
    "next_service_mileage": {
      "type": "number",
      "description": "Trigger alert when vehicle reaches this mileage"
    },
    "next_service_date": {
      "type": "string",
      "format": "date-time",
      "description": "Date to trigger next service alert"
    },
    "cost": {
      "type": "number",
      "description": "Cost of service in currency"
    },
    "technician": {
      "type": "string",
      "description": "Technician or garage name"
    },
    "status": {
      "type": "string",
      "enum": [
        "scheduled",
        "in_progress",
        "completed"
      ],
      "default": "completed"
    },
    "notes": {
      "type": "string"
    }
  },
  "required": [
    "vehicle_id",
    "type",
    "service_date"
  ]
}