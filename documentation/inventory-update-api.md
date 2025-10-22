# Inventory Update API

## Endpoint: POST /api/products/update-inventory

This endpoint allows updating product inventory by SKU. It checks if the SKU exists and updates the inventory accordingly.

### Request Body

```json
{
    "productName": "Product Name (optional)",
    "productPrice": 100.00,
    "sku": "SKU123",
    "inventory": 50
}
```

### Required Fields
- `sku` (string): The SKU of the product to update
- `inventory` (number): The new inventory quantity (must be non-negative)

### Optional Fields
- `productName` (string): Product name (for reference, not used in update)
- `productPrice` (number): Product price (for reference, not used in update)

### Response Examples

#### Success Response (200)
```json
{
    "success": true,
    "message": "Inventory updated successfully",
    "data": {
        "sku": "SKU123",
        "productName": "Sample Product",
        "oldInventory": 25,
        "newInventory": 50,
        "updated": true
    }
}
```

#### SKU Not Found (404)
```json
{
    "success": false,
    "message": "Product with SKU 'SKU123' not found",
    "data": {
        "sku": "SKU123",
        "found": false
    }
}
```

#### Validation Error (400)
```json
{
    "success": false,
    "message": "SKU and inventory are required"
}
```

### Usage Examples

#### cURL
```bash
curl -X POST http://localhost:3300/api/products/update-inventory \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "SKU123",
    "inventory": 50
  }'
```

#### JavaScript (fetch)
```javascript
const response = await fetch('http://localhost:3300/api/products/update-inventory', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        sku: 'SKU123',
        inventory: 50
    })
});

const data = await response.json();
console.log(data);
```

### Behavior
1. The endpoint receives the request body with SKU and inventory
2. It validates that SKU and inventory are provided and inventory is a valid number
3. It checks if a product with the given SKU exists in the database
4. If the SKU exists, it updates the inventory with the new value
5. If the SKU doesn't exist, it returns a 404 error and skips the update
6. The response includes both old and new inventory values for confirmation

### Notes
- Only the inventory field is updated, other product fields remain unchanged
- The `updatedAt` timestamp is automatically updated when inventory is changed
- This endpoint is designed for bulk inventory updates where you have a list of SKUs and their new inventory values
