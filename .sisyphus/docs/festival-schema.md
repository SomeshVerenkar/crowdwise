# Festival Data Schema

> Version: 1.0  
> Last Updated: February 14, 2026  
> Used By: `js/festival-service.js`, `client-algorithm.js`

## Overview

This schema defines the structure for storing 100+ regional Indian festivals that affect crowd predictions at tourist destinations. Festivals create crowd multipliers (1.1x - 2.5x) that stack with existing time/day/season factors.

## JSON Schema Definition

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CrowdWise Festival Data",
  "type": "object",
  "required": ["version", "lastUpdated", "festivals"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+$",
      "description": "Schema version for migrations"
    },
    "lastUpdated": {
      "type": "string",
      "format": "date",
      "description": "ISO 8601 date of last update"
    },
    "festivals": {
      "type": "array",
      "items": { "$ref": "#/definitions/festival" }
    }
  },
  "definitions": {
    "festival": {
      "type": "object",
      "required": ["id", "name", "destinations", "startDate", "endDate", "impact", "impactLevel"],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[a-z0-9_]+$",
          "description": "Unique festival identifier (lowercase, underscores)"
        },
        "name": {
          "type": "string",
          "maxLength": 100,
          "description": "Display name of the festival"
        },
        "destinations": {
          "type": "array",
          "items": { "type": "integer", "minimum": 1, "maximum": 224 },
          "minItems": 1,
          "description": "Array of destination IDs from data.js (1-224)"
        },
        "categories": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Affected destination categories (optional - applies to all if omitted)"
        },
        "dateType": {
          "type": "string",
          "enum": ["fixed", "lunar"],
          "default": "fixed",
          "description": "fixed = same date yearly, lunar = varies by calendar"
        },
        "startDate": {
          "type": "string",
          "format": "date",
          "description": "Start date in YYYY-MM-DD format"
        },
        "endDate": {
          "type": "string",
          "format": "date",
          "description": "End date in YYYY-MM-DD format (inclusive)"
        },
        "impact": {
          "type": "number",
          "minimum": 1.0,
          "maximum": 2.5,
          "description": "Crowd multiplier factor"
        },
        "impactLevel": {
          "type": "string",
          "enum": ["EXTREME", "VERY_HIGH", "HIGH", "MODERATE"],
          "description": "Impact classification for UI display"
        },
        "region": {
          "type": "string",
          "description": "Geographic region (e.g., 'South India', 'Goa')"
        },
        "description": {
          "type": "string",
          "maxLength": 200,
          "description": "Brief description for tooltips"
        }
      }
    }
  }
}
```

## Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier, lowercase with underscores (e.g., `tirupati_brahmotsavam`) |
| `name` | string | Yes | Human-readable name (e.g., "Tirupati Brahmotsavam") |
| `destinations` | int[] | Yes | Array of destination IDs from data.js (1-224) |
| `categories` | string[] | No | Destination categories affected. If omitted, applies to all categories at listed destinations |
| `dateType` | string | No | `"fixed"` (same date yearly) or `"lunar"` (varies). Default: `"fixed"` |
| `startDate` | string | Yes | Start date in ISO format (YYYY-MM-DD) |
| `endDate` | string | Yes | End date in ISO format (YYYY-MM-DD), inclusive |
| `impact` | number | Yes | Crowd multiplier (1.0 - 2.5) |
| `impactLevel` | string | Yes | Classification: `EXTREME`, `VERY_HIGH`, `HIGH`, `MODERATE` |
| `region` | string | No | Geographic region for filtering |
| `description` | string | No | Brief description (max 200 chars) |

## Impact Level Definitions

| Level | Multiplier Range | Description | Example Festivals |
|-------|------------------|-------------|-------------------|
| **EXTREME** | 1.8x - 2.5x | Massive crowds, destination at capacity | Kumbh Mela, Tirupati Brahmotsavam, Pushkar Fair |
| **VERY_HIGH** | 1.4x - 1.7x | Very high crowds, significantly busier | Durga Puja, Diwali at Varanasi, Goa Carnival |
| **HIGH** | 1.2x - 1.3x | Noticeably busier than normal | Onam, Pongal, Christmas at Goa |
| **MODERATE** | 1.1x | Slightly elevated crowds | Local temple festivals, regional fairs |

## Date Handling

### Fixed Date Festivals
Occur on the same date every year:
```json
{
  "id": "christmas_goa",
  "dateType": "fixed",
  "startDate": "2026-12-24",
  "endDate": "2026-12-26"
}
```

### Lunar Calendar Festivals
Dates vary yearly based on Hindu/Islamic lunar calendar. Must be updated annually:
```json
{
  "id": "durga_puja_kolkata",
  "dateType": "lunar",
  "startDate": "2026-09-28",
  "endDate": "2026-10-02"
}
```

**Note**: Lunar festivals require annual date updates (typically in December for the following year).

## Destination ID Reference

Destinations are referenced by their numeric ID from `data.js`. Key destination IDs:

| ID | Destination | State |
|----|-------------|-------|
| 1 | Taj Mahal | Uttar Pradesh |
| 4 | Tirupati Temple | Andhra Pradesh |
| 17 | Varanasi Ghats | Uttar Pradesh |
| 24 | Pushkar Lake | Rajasthan |
| 35 | Kolkata Victoria Memorial | West Bengal |
| 52 | Goa Beaches | Goa |

(Full list in data.js - 224 destinations)

## Example Entries

### EXTREME Impact
```json
{
  "id": "tirupati_brahmotsavam",
  "name": "Tirupati Brahmotsavam",
  "destinations": [4],
  "categories": ["temple", "religious"],
  "dateType": "lunar",
  "startDate": "2026-09-25",
  "endDate": "2026-10-04",
  "impact": 2.2,
  "impactLevel": "EXTREME",
  "region": "South India",
  "description": "9-day annual festival at Tirumala temple, over 500,000 pilgrims"
}
```

### VERY_HIGH Impact
```json
{
  "id": "goa_carnival",
  "name": "Goa Carnival",
  "destinations": [52, 53, 54, 55],
  "dateType": "fixed",
  "startDate": "2026-02-14",
  "endDate": "2026-02-17",
  "impact": 1.6,
  "impactLevel": "VERY_HIGH",
  "region": "Goa",
  "description": "4-day carnival with parades, music, and festivities across Goa"
}
```

### HIGH Impact
```json
{
  "id": "onam_kerala",
  "name": "Onam Festival",
  "destinations": [60, 61, 62, 63, 64],
  "categories": ["backwaters", "cultural"],
  "dateType": "lunar",
  "startDate": "2026-08-28",
  "endDate": "2026-09-08",
  "impact": 1.3,
  "impactLevel": "HIGH",
  "region": "Kerala",
  "description": "10-day harvest festival with boat races and cultural events"
}
```

### MODERATE Impact
```json
{
  "id": "local_temple_fair",
  "name": "Local Temple Festival",
  "destinations": [100],
  "dateType": "lunar",
  "startDate": "2026-03-15",
  "endDate": "2026-03-16",
  "impact": 1.1,
  "impactLevel": "MODERATE",
  "description": "Annual local temple celebration"
}
```

## Size Estimation

| Component | Size per Festival | 100 Festivals |
|-----------|-------------------|---------------|
| JSON overhead | ~50 bytes | 5 KB |
| Festival data | ~400 bytes avg | 40 KB |
| **Total** | | **~45 KB** |

Target: <50 KB for 100 festivals (well within limits)

## Usage in Code

```javascript
// festival-service.js will implement:
function getActiveFestivals(date) {
  // Returns festivals where startDate <= date <= endDate
}

function getFestivalImpact(destinationId, date) {
  // Returns highest impact multiplier for destination on date
  // If multiple festivals, returns max impact (not additive)
}

// client-algorithm.js integration:
const festivalMultiplier = FestivalService.getFestivalImpact(destinationId, today);
crowdScore *= Math.min(festivalMultiplier, 2.5); // Cap at 2.5x
```

## Validation Rules

1. `id` must be unique across all festivals
2. `startDate` must be <= `endDate`
3. `destinations` must contain valid IDs (1-224)
4. `impact` must match `impactLevel` range
5. Date range should not exceed 30 days (except Kumbh Mela)

## Migration Strategy

Version changes trigger migrations:
- **1.0 → 1.1**: Add new optional fields (backward compatible)
- **1.x → 2.0**: Breaking changes require data transformation

```javascript
if (data.version < "2.0") {
  data = migrateToV2(data);
}
```
