# API Contracts: Operational Cost Profiles

**Branch**: `002-operational-cost-profiles` | **Date**: 2026-04-11

## Endpoints

### GET /api/cost-profiles

Returns all cost profiles ordered by creation date.

#### Response (200)
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Standard Eco-Box",
      "category": "packaging",
      "unitCost": "15.00",
      "applicationRule": "per_item",
      "isActive": true,
      "createdAt": "2026-04-11T..."
    }
  ]
}
```

### POST /api/cost-profiles

Creates a new cost profile.

#### Request Body
```json
{
  "name": "Standard Eco-Box",
  "category": "packaging",
  "unitCost": "15.00",
  "applicationRule": "per_item"
}
```

#### Response (201)
```json
{
  "data": { "id": "uuid", "name": "...", ... }
}
```

### PUT /api/cost-profiles/[id]

Updates a cost profile. Supports partial updates.

#### Request Body
```json
{
  "name": "Updated Name",
  "unitCost": "20.00",
  "isActive": false
}
```

#### Response (200)
```json
{
  "data": { "id": "uuid", ... }
}
```

### DELETE /api/cost-profiles/[id]

Deletes a cost profile.

#### Response (200)
```json
{
  "data": { "ok": true }
}
```
