{
  "name": "ReportSchedule",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Report schedule name"
    },
    "recipient_email": {
      "type": "string",
      "description": "Email to send weekly report to"
    },
    "day_of_week": {
      "type": "number",
      "description": "Day of week to send (0=Sunday, 1=Monday... 6=Saturday)",
      "default": 1
    },
    "include_all_vehicles": {
      "type": "boolean",
      "default": true
    },
    "vehicle_ids": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "is_active": {
      "type": "boolean",
      "default": true
    },
    "last_sent": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": [
    "name",
    "recipient_email"
  ]
}