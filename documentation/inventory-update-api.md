# Inventory Update API

## Endpoint: POST /api/products/update-inventory

This endpoint allows updating product inventory by SKU for multiple products at once. It processes an array of products, checking if each SKU exists and updating the inventory accordingly.

### Request Body

The request body must be an array of product objects:

```json
[
    {
        "productName": "Product Name 1",
        "productPrice": 100.00,
        "sku": "SKU123",
        "inventory": 50
    },
    {
        "productName": "Product Name 2", 
        "productPrice": 200.00,
        "sku": "SKU456",
        "inventory": 25
    }
]
```

### Required Fields (for each product object)
- `sku` (string): The SKU of the product to update
- `inventory` (number): The new inventory quantity (must be non-negative)

### Optional Fields (for each product object)
- `productName` (string): Product name (for reference, not used in update)
- `productPrice` (number): Product price (for reference, not used in update)

### Response Examples

#### All Products Success (200)
```json
{
    "success": true,
    "message": "Processed 2 products",
    "data": {
        "totalProcessed": 2,
        "successful": 2,
        "failed": 0,
        "results": [
            {
                "index": 0,
                "sku": "SKU123",
                "productName": "Sample Product 1",
                "oldInventory": 25,
                "newInventory": 50,
                "updated": true
            },
            {
                "index": 1,
                "sku": "SKU456",
                "productName": "Sample Product 2",
                "oldInventory": 10,
                "newInventory": 25,
                "updated": true
            }
        ],
        "errors": []
    }
}
```

#### Partial Success (207 Multi-Status)
```json
{
    "success": true,
    "message": "Processed 3 products",
    "data": {
        "totalProcessed": 3,
        "successful": 2,
        "failed": 1,
        "results": [
            {
                "index": 0,
                "sku": "SKU123",
                "productName": "Sample Product 1",
                "oldInventory": 25,
                "newInventory": 50,
                "updated": true
            },
            {
                "index": 2,
                "sku": "SKU789",
                "productName": "Sample Product 3",
                "oldInventory": 5,
                "newInventory": 15,
                "updated": true
            }
        ],
        "errors": [
            {
                "index": 1,
                "sku": "SKU456",
                "error": "Product with SKU not found",
                "found": false
            }
        ]
    }
}
```

#### All Products Failed (400)
```json
{
    "success": false,
    "message": "All products failed to update",
    "data": {
        "totalProcessed": 2,
        "successful": 0,
        "failed": 2,
        "results": [],
        "errors": [
            {
                "index": 0,
                "sku": "SKU123",
                "error": "Inventory must be a valid non-negative number"
            },
            {
                "index": 1,
                "sku": "SKU456",
                "error": "Product with SKU not found",
                "found": false
            }
        ]
    }
}
```

#### Validation Error (400)
```json
{
    "success": false,
    "message": "Request body must be an array of products"
}
```

### Usage Examples

#### cURL
```bash
curl -X POST http://localhost:8800/api/products/update-inventory \
  -H "Content-Type: application/json" \
  -d '[
    {
        "sku": "SKU123",
        "inventory": 50,
        "productName": "Product 1",
        "productPrice": 100.00
    },
    {
        "sku": "SKU456", 
        "inventory": 25,
        "productName": "Product 2",
        "productPrice": 200.00
    }
  ]'
```

#### JavaScript (fetch)
```javascript
const products = [
    {
        sku: 'SKU123',
        inventory: 50,
        productName: 'Product 1',
        productPrice: 100.00
    },
    {
        sku: 'SKU456',
        inventory: 25,
        productName: 'Product 2', 
        productPrice: 200.00
    }
];

const response = await fetch('http://localhost:8800/api/products/update-inventory', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(products)
});

const data = await response.json();
console.log(data);
```

### Behavior
1. The endpoint receives an array of product objects
2. It validates that the request body is an array and not empty
3. For each product in the array:
   - Validates that SKU and inventory are provided and inventory is a valid number
   - Checks if a product with the given SKU exists in the database
   - If the SKU exists, updates the inventory with the new value
   - If the SKU doesn't exist, adds it to the errors list and continues with the next product
4. Returns a comprehensive response with successful updates and any errors
5. Uses appropriate HTTP status codes:
   - 200: All products updated successfully
   - 207: Some products updated, some failed (Multi-Status)
   - 400: All products failed or invalid request format
   - 500: Server error

### Notes
- Only the inventory field is updated, other product fields remain unchanged
- The `updatedAt` timestamp is automatically updated when inventory is changed
- This endpoint is designed for bulk inventory updates where you have a list of SKUs and their new inventory values
- Each product is processed independently - if one fails, others can still succeed
- The response includes detailed information about each product's processing result
- Index numbers in the response correspond to the position in the original request array
