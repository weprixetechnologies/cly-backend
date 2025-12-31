# Bulk Product Addition API

## Endpoint: POST /api/products/bulk-add

This endpoint allows bulk creation of products in the system. It's designed for supplier integrations where multiple products need to be added at once.

### Authentication
- **Currently**: No authentication required (for testing)
- **Future**: Admin or supplier token authentication

### Request Headers
```
Content-Type: application/json
```

### Request Body

#### Required Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `supplier_token` | string | Supplier authentication token (currently not validated) |
| `Data` | array | Array of product objects |

#### Product Object (within Data array)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sku` | string | Yes | Stock Keeping Unit identifier |
| `productName` | string | Yes | Name of the product |
| `productPrice` | number | No | Selling price of the product |
| `productMRP` | number | No | Maximum Retail Price |
| `inventory` | number | No | Stock quantity (default: 0) |
| `tax` | number | No | Tax percentage |
| `brand` | string | No | Brand name |
| `hsn` | string | No | HSN code for the product |
| `categoryName` | string | No | Category name |
| `description` | string | No | Product description |

### Request Body Example

```json
{
    "supplier_token": "",
    "Data": [
        {
            "sku": "SKU001",
            "productName": "Item 1",
            "productMRP": 12131,
            "inventory": -1,
            "tax": 18,
            "brand": "Primary",
            "hsn": "Not Found",
            "categoryName": "",
            "productPrice": 11,
            "description": ""
        },
        {
            "sku": "SKU002",
            "productName": "Item 2",
            "productMRP": 12131,
            "inventory": 50,
            "tax": 18,
            "brand": "Primary",
            "hsn": "12345678",
            "categoryName": "Electronics",
            "productPrice": 10,
            "description": "Sample description"
        }
    ]
}
```

### Response Examples

#### Success Response (201) - All Products Created
```json
{
    "success": true,
    "message": "Bulk product creation completed",
    "data": {
        "total": 2,
        "successful": 2,
        "failed": 0,
        "results": [
            {
                "index": 0,
                "sku": "SKU001",
                "productID": "PRDabc123def",
                "productName": "Item 1",
                "status": "created"
            },
            {
                "index": 1,
                "sku": "SKU002",
                "productID": "PRDdef456ghi",
                "productName": "Item 2",
                "status": "created"
            }
        ],
        "errors": []
    }
}
```

#### Partial Success (207) - Some Products Failed
```json
{
    "success": true,
    "message": "Bulk product creation completed",
    "data": {
        "total": 2,
        "successful": 1,
        "failed": 1,
        "results": [
            {
                "index": 0,
                "sku": "SKU001",
                "productID": "PRDabc123def",
                "productName": "Item 1",
                "status": "created"
            }
        ],
        "errors": [
            {
                "index": 1,
                "sku": "SKU002",
                "error": "SKU already exists",
                "action": "skipped"
            }
        ]
    }
}
```

#### All Failed (400)
```json
{
    "success": false,
    "message": "All products failed to create",
    "data": {
        "total": 2,
        "successful": 0,
        "failed": 2,
        "results": [],
        "errors": [
            {
                "index": 0,
                "sku": "SKU001",
                "error": "SKU already exists",
                "action": "skipped"
            },
            {
                "index": 1,
                "sku": "SKU002",
                "error": "SKU already exists",
                "action": "skipped"
            }
        ]
    }
}
```

#### Validation Error (400) - Missing Required Field
```json
{
    "success": false,
    "message": "Product at index 0 is missing required field: sku"
}
```

#### Validation Error (400) - Invalid Data Structure
```json
{
    "success": false,
    "message": "Data must be an array of products"
}
```

#### Server Error (500)
```json
{
    "success": false,
    "message": "Failed to create products in bulk",
    "error": "Error message details"
}
```

### Field Mapping

The API maps incoming fields to database columns as follows:

| Incoming Field | Database Column | Notes |
|---------------|--------------|-------|
| `sku` | `sku` | Unique identifier |
| `productName` | `productName` | Product name |
| `productPrice` | `productPrice` | Selling price |
| `productMRP` | `productMRP` | Maximum Retail Price |
| `inventory` | `inventory` | Stock quantity |
| `tax` | `tax` | Tax percentage |
| `brand` | `brand` | Brand name |
| `hsn` | `hsn` | HSN code |
| `categoryName` | `categoryName` | Category name |
| `description` | `description` | Product description |

### Behavior

1. **SKU Validation**: Each product's SKU is checked for uniqueness. If a SKU already exists, that product is skipped and added to the errors array.

2. **Auto-generated Fields**: 
   - `productID`: Automatically generated unique identifier (format: `PRD` + 9 random characters)
   - `featuredImages`: Set to empty string
   - `galleryImages`: Set to empty array `[]`
   - `status`: Defaults to `'active'`
   - `createdAt`: Automatically set to current timestamp

3. **Default Values**:
   - `productPrice`: Defaults to 0 if not provided
   - `inventory`: Defaults to 0 if not provided
   - `categoryName`: Set to null if empty string or not provided
   - `description`: Defaults to empty string

4. **Error Handling**: The API processes all products even if some fail. Results and errors are returned together, allowing you to see which products succeeded and which failed.

### Usage Examples

#### cURL
```bash
curl -X POST http://localhost:9878/api/products/bulk-add \
  -H "Content-Type: application/json" \
  -d '{
    "supplier_token": "",
    "Data": [
        {
            "sku": "SKU001",
            "productName": "Item 1",
            "productMRP": 12131,
            "inventory": 10,
            "tax": 18,
            "brand": "Primary",
            "hsn": "Not Found",
            "categoryName": "Electronics",
            "productPrice": 11,
            "description": "Sample product"
        }
    ]
}'
```

#### JavaScript (fetch)
```javascript
const response = await fetch('http://localhost:9878/api/products/bulk-add', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        supplier_token: "",
        Data: [
            {
                sku: "SKU001",
                productName: "Item 1",
                productMRP: 12131,
                inventory: 10,
                tax: 18,
                brand: "Primary",
                hsn: "Not Found",
                categoryName: "Electronics",
                productPrice: 11,
                description: "Sample product"
            }
        ]
    })
});

const result = await response.json();
console.log(result);
```

### Database Migration Required

Before using this API, you must add the following columns to your products table:

```sql
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS productMRP DECIMAL(10,2) DEFAULT NULL AFTER productPrice,
ADD COLUMN IF NOT EXISTS tax DECIMAL(5,2) DEFAULT NULL AFTER productMRP,
ADD COLUMN IF NOT EXISTS brand VARCHAR(255) DEFAULT NULL AFTER tax,
ADD COLUMN IF NOT EXISTS hsn VARCHAR(50) DEFAULT NULL AFTER brand;

CREATE INDEX IF NOT EXISTS idx_products_hsn ON products(hsn);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
```

Run this SQL migration script before using the bulk-add endpoint.

### Notes

- Products with duplicate SKUs are automatically skipped
- The API returns partial success (207 status) if some products fail
- All validations happen before any database operations
- Product IDs are auto-generated and guaranteed to be unique

