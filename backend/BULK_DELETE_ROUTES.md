# Bulk Route Deletion API

## Overview
Added comprehensive bulk deletion functionality for tariff rates and routes, allowing you to select and delete multiple items at once.

## New Endpoints

### 1. Bulk Delete Specific Rates
**Endpoint**: `DELETE /tariff-rates/bulk-delete`

Delete multiple tariff rates by their IDs.

**Request Body**:
```json
{
  "rate_ids": [123, 456, 789],
  "force_delete": false,
  "reason": "Cleanup outdated rates"
}
```

**Parameters**:
- `rate_ids` (required): Array of rate IDs to delete
- `force_delete` (optional): If true, deletes even rates referenced by shipments
- `reason` (optional): Reason for deletion (for audit trail)

**Response**:
```json
{
  "success": true,
  "message": "Successfully deleted 3 tariff rates",
  "deleted_count": 3,
  "total_requested": 3,
  "deleted_rates": [
    {
      "id": 123,
      "route": "CN → US",
      "category": "Electronics",
      "postal_service": "EMS",
      "tariff_rate": 0.085,
      "deleted_reason": "Cleanup outdated rates"
    }
  ],
  "force_delete_used": false
}
```

### 2. Bulk Delete Entire Routes
**Endpoint**: `DELETE /tariff-routes/bulk-delete`

Delete ALL rates for multiple routes (origin → destination combinations).

**Request Body**:
```json
{
  "routes": [
    "CN → US",
    "CN → CA", 
    "JP → US"
  ],
  "force_delete": false,
  "reason": "Route restructuring"
}
```

**Parameters**:
- `routes` (required): Array of route strings in format "Origin → Destination"
- `force_delete` (optional): If true, deletes even if rates are referenced
- `reason` (optional): Reason for deletion

**Response**:
```json
{
  "success": true,
  "message": "Successfully deleted all rates for 3 routes (12 total rates)",
  "deleted_count": 12,
  "routes_processed": 3,
  "routes_summary": {
    "CN → US": {
      "rate_count": 5,
      "categories": ["Electronics", "Documents", "*"],
      "services": ["EMS", "Air Mail"],
      "usage_count": 0,
      "rate_ids": [123, 124, 125, 126, 127]
    }
  },
  "force_delete_used": false,
  "deletion_reason": "Route restructuring"
}
```

## Safety Features

### 1. Usage Protection
- **Default Behavior**: Prevents deletion of rates referenced by processed shipments
- **Override**: Use `force_delete: true` to delete anyway
- **Detailed Reporting**: Shows exactly which rates have shipment references

### 2. Error Handling
```json
{
  "success": false,
  "error": "Cannot delete 2 rates that are referenced by processed shipments",
  "rates_with_usage": [
    {
      "id": 123,
      "route": "CN → US",
      "category": "Electronics",
      "usage_count": 45,
      "base_usage": 40,
      "surcharge_usage": 5
    }
  ],
  "suggestion": "Use force_delete=true to override, or consider deactivating instead",
  "deletable_count": 3,
  "blocked_count": 2
}
```

### 3. Transaction Safety
- All operations are wrapped in database transactions
- If any deletion fails, entire operation rolls back
- No partial deletions

## Usage Examples

### Example 1: Delete Specific Rates
```javascript
// Delete selected rates
fetch('/tariff-rates/bulk-delete', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rate_ids: [101, 102, 103],
    reason: "User requested cleanup"
  })
})
```

### Example 2: Delete Entire Routes
```javascript
// Delete all rates for selected routes
fetch('/tariff-routes/bulk-delete', {
  method: 'DELETE', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    routes: ["CN → US", "JP → CA"],
    reason: "Route consolidation"
  })
})
```

### Example 3: Force Delete with Override
```javascript
// Force delete even if rates are in use
fetch('/tariff-rates/bulk-delete', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rate_ids: [201, 202, 203],
    force_delete: true,
    reason: "Emergency cleanup - rates no longer valid"
  })
})
```

## UI Integration Suggestions

### Multi-Select Interface
```javascript
// Frontend checkbox selection
const selectedRateIds = [];
const selectedRoutes = [];

// For individual rates
document.querySelectorAll('.rate-checkbox:checked').forEach(cb => {
  selectedRateIds.push(parseInt(cb.value));
});

// For entire routes
document.querySelectorAll('.route-checkbox:checked').forEach(cb => {
  selectedRoutes.push(cb.dataset.route);
});
```

### Confirmation Dialog
```javascript
// Show confirmation with details
const confirmDelete = async () => {
  const response = await fetch('/tariff-routes/bulk-delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routes: selectedRoutes,
      force_delete: false
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    if (error.rates_with_usage) {
      // Show warning about rates in use
      showWarningDialog(error);
    }
  }
};
```

## Migration from Single Delete

The existing single delete endpoints remain unchanged:
- `DELETE /tariff-rates/{id}` - Still works for individual rates
- New bulk endpoints provide additional functionality

## Performance Notes

- **Optimized Queries**: Uses batch operations instead of individual deletions
- **Usage Checking**: Single query per rate to check shipment references
- **Minimal Database Round-trips**: Efficient bulk operations
- **Transaction Safety**: All-or-nothing approach prevents partial failures

## Audit Trail

All deletions include:
- Timestamp of deletion
- User-provided reason
- Count of affected rates/routes
- Details of what was deleted
- Warning if force delete was used

This provides comprehensive bulk deletion functionality while maintaining data integrity and safety.
