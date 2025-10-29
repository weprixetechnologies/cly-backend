# Product Creation API

## Endpoint: POST /api/products/add

This endpoint allows creating a new product in the system. It generates a unique product ID and stores all product information in the database.

### Authentication (Will be shared with JWT token once done testing)
- **Required**: Admin authentication (currently disabled for testing)
- **Middleware**: `verifyAdminAccessToken` (commented out)

### Request Headers
```
Content-Type: application/json
Authorization: Bearer <admin_token> (if authentication is enabled)
```

### Request Body

#### Required Parameters
| Parameter | Type | Description | Validation |
|-----------|------|-------------|------------|
| `productName` | string | Name of the product | Required, non-empty string |
| `sku` | string | Stock Keeping Unit identifier | Required, unique identifier |

#### Optional Parameters
| Parameter | Type | Default | Description | Validation |
|-----------|------|---------|-------------|------------|
| `productPrice` | number | null | Price of the product | If provided, must be positive number |
| `description` | string | `""` | Product description | Any string, can be empty |
| `boxQty` | number | `0` | Quantity per box | Non-negative integer |
| `minQty` | number | `1` | Minimum order quantity | Non-negative integer |
| `categoryID` | string | `null` | Category identifier | Any string or null |
| `categoryName` | string | `null` | Category name | Any string or null |
| `featuredImages` | string | `""` | Featured image URL/path | Any string, can be empty |
| `galleryImages` | array | `[]` | Array of gallery image URLs | Array of strings |
| `inventory` | number | `0` | Available stock quantity | Non-negative integer |

### Request Body Example

#### Minimal Required Request
```json
{
    "productName": "Sample Product",
    "sku": "SKU123"
}
```

#### Complete Request
```json
{
    "productName": "Premium Wireless Headphones",
    "productPrice": 299.99,
    "sku": "WH-001",
    "description": "High-quality wireless headphones with noise cancellation",
    "boxQty": 10,
    "minQty": 1,
    "categoryID": "CAT001",
    "categoryName": "Electronics",
    "featuredImages": "https://example.com/headphones.jpg",
    "galleryImages": [
        "https://example.com/headphones1.jpg",
        "https://example.com/headphones2.jpg",
        "https://example.com/headphones3.jpg"
    ],
    "inventory": 50
}
```

### Response Examples

#### Success Response (201)
```json
{
    "success": true,
    "message": "Product created successfully",
    "data": {
        "productID": "PRDabc123def"
    }
}
```

#### Validation Error (400) - Missing Required Fields
```json
{
    "success": false,
    "message": "Product name, price, and SKU are required"
}
```

#### Validation Error (400) - Invalid Price
```json
{
    "success": false,
    "message": "Product price must be a valid positive number"
}
```

#### Validation Error (400) - Invalid Quantity
```json
{
    "success": false,
    "message": "boxQty must be a valid non-negative number"
}
```

#### Server Error (500)
```json
{
    "success": false,
    "message": "Failed to create product",
    "error": "Database connection failed"
}
```

### Field Details

#### Required Fields

##### `productName` (string)
- **Purpose**: Human-readable name of the product
- **Validation**: Must be a non-empty string
- **Example**: `"Wireless Bluetooth Headphones"`
- **Error**: Returns 400 if missing or empty

##### `sku` (string)
- **Purpose**: Unique identifier for inventory management
- **Validation**: Must be a non-empty string
- **Example**: `"WH-001"`, `"PROD-12345"`
- **Error**: Returns 400 if missing or empty
- **Note**: Should be unique across all products

#### Optional Fields

##### `productPrice` (number)
- **Purpose**: Selling price of the product
- **Validation**: If provided, must be a positive number
- **Default**: `null` (if not provided)
- **Example**: `299.99`, `1500.00`
- **Error**: Returns 400 if negative or not a number

##### `description` (string)
- **Purpose**: Detailed description of the product
- **Validation**: Any string (including empty)
- **Default**: `""` (empty string)
- **Example**: `"High-quality wireless headphones with noise cancellation"`
- **Max Length**: No specific limit (database dependent)

##### `boxQty` (number)
- **Purpose**: Number of units per box for packaging
- **Validation**: Non-negative integer
- **Default**: `0`
- **Example**: `10`, `24`, `100`
- **Error**: Returns 400 if negative or not a number

##### `minQty` (number)
- **Purpose**: Minimum quantity that can be ordered
- **Validation**: Non-negative integer
- **Default**: `1`
- **Example**: `1`, `5`, `12`
- **Error**: Returns 400 if negative or not a number

##### `categoryID` (string)
- **Purpose**: Reference to product category
- **Validation**: Any string or null
- **Default**: `null`
- **Example**: `"CAT001"`, `"electronics-001"`
- **Note**: Should reference existing category if used

##### `categoryName` (string)
- **Purpose**: Human-readable category name
- **Validation**: Any string or null
- **Default**: `null`
- **Example**: `"Electronics"`, `"Clothing"`, `"Home & Garden"`

##### `featuredImages` (string)
- **Purpose**: Main product image URL or file path
- **Validation**: Any string (including empty)
- **Default**: `""` (empty string)
- **Example**: `"https://example.com/product.jpg"`, `"/images/product.jpg"`

##### `galleryImages` (array)
- **Purpose**: Array of additional product images
- **Validation**: Array of strings
- **Default**: `[]` (empty array)
- **Example**: `["https://example.com/img1.jpg", "https://example.com/img2.jpg"]`
- **Note**: Stored as JSON in database

##### `inventory` (number)
- **Purpose**: Available stock quantity
- **Validation**: Non-negative integer
- **Default**: `0`
- **Example**: `50`, `100`, `0` (out of stock)
- **Error**: Returns 400 if negative or not a number

### Usage Examples

#### cURL - Minimal Request
```bash
curl -X POST http://72.60.219.181:3300/api/products/add \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Sample Product",
    "sku": "SKU123"
  }'
```

#### cURL - Complete Request
```bash
curl -X POST http://72.60.219.181:3300/api/products/add \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Premium Wireless Headphones",
    "productPrice": 299.99,
    "sku": "WH-001",
    "description": "High-quality wireless headphones with noise cancellation",
    "boxQty": 10,
    "minQty": 1,
    "categoryID": "CAT001",
    "categoryName": "Electronics",
    "featuredImages": "https://example.com/headphones.jpg",
    "galleryImages": [
      "https://example.com/headphones1.jpg",
      "https://example.com/headphones2.jpg"
    ],
    "inventory": 50
  }'
```

#### JavaScript (fetch)
```javascript
const productData = {
    productName: "Premium Wireless Headphones",
    productPrice: 299.99,
    sku: "WH-001",
    description: "High-quality wireless headphones with noise cancellation",
    boxQty: 10,
    minQty: 1,
    categoryID: "CAT001",
    categoryName: "Electronics",
    featuredImages: "https://example.com/headphones.jpg",
    galleryImages: [
        "https://example.com/headphones1.jpg",
        "https://example.com/headphones2.jpg"
    ],
    inventory: 50
};

const response = await fetch('http://72.60.219.181:3300/api/products/add', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(productData)
});

const result = await response.json();
console.log(result);
```

### Database Behavior

#### Auto-Generated Fields
- **`productID`**: Automatically generated unique identifier (format: `PRD` + 9 random characters)
- **`createdAt`**: Automatically set to current timestamp
- **`updatedAt`**: Automatically set to current timestamp
- **`status`**: Defaults to `'active'` (if not specified)

#### Data Processing
- **`productPrice`**: Converted to float using `parseFloat()`
- **`boxQty`**: Converted to integer using `parseInt()` or defaults to 0
- **`minQty`**: Converted to integer using `parseInt()` or defaults to 1
- **`inventory`**: Converted to integer using `parseInt()` or defaults to 0
- **`galleryImages`**: Converted to JSON string for database storage

### Error Handling

#### Validation Errors (400)
- Missing required fields (`productName` or `sku`)
- Invalid price (negative or non-numeric)
- Invalid quantities (negative or non-numeric for `boxQty`, `minQty`, `inventory`)

#### Server Errors (500)
- Database connection issues
- SQL execution errors
- Unexpected server errors

### Notes
- Product ID is automatically generated and guaranteed to be unique
- All optional fields have sensible defaults
- The API is designed to be flexible - you can create products with minimal information and add details later
- Gallery images are stored as JSON in the database
- Category information can be provided as both ID and name for flexibility
