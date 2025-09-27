# Database Migrations

## Running Migrations

To apply the database migrations, run the following SQL commands in your MySQL database:

### 1. Add Order Details Fields

Run the SQL script to add address and payment fields to the orders table:

```sql
-- Add address and payment fields to orders table
ALTER TABLE orders 
ADD COLUMN addressName VARCHAR(255) AFTER orderStatus,
ADD COLUMN addressPhone VARCHAR(20) AFTER addressName,
ADD COLUMN addressLine1 TEXT AFTER addressPhone,
ADD COLUMN addressLine2 TEXT AFTER addressLine2,
ADD COLUMN addressCity VARCHAR(100) AFTER addressLine2,
ADD COLUMN addressState VARCHAR(100) AFTER addressCity,
ADD COLUMN addressPincode VARCHAR(10) AFTER addressState,
ADD COLUMN paymentMode ENUM('COD', 'PREPAID', 'PHONEPE') DEFAULT 'COD' AFTER addressPincode,
ADD COLUMN couponCode VARCHAR(50) AFTER paymentMode;
```

### 2. Verify Migration

After running the migration, verify that the orders table has the new columns:

```sql
DESCRIBE orders;
```

You should see the new columns:
- addressName
- addressPhone
- addressLine1
- addressLine2
- addressCity
- addressState
- addressPincode
- paymentMode
- couponCode

## Order API Endpoints

After running the migration, the following order endpoints will be available:

- `POST /api/order/:uid/place-order` - Place a new order
- `GET /api/order/:uid/orders` - Get all orders for a user
- `GET /api/order/:orderID` - Get specific order details
- `PUT /api/order/:orderID/status` - Update order status (admin only)

## Frontend Integration

The frontend cart page has been updated to:
1. Allow manual address entry
2. Support COD payment only
3. Call the new order placement API
4. Redirect to order success page after successful order placement

