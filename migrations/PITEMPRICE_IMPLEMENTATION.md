# pItemPrice Implementation

This document describes the implementation of the `pItemPrice` column to store individual product prices for each order item.

## Overview

The `pItemPrice` column has been added to the `orders` table to store the individual product price for each order item. This allows displaying the amount for each item in order history and other places where individual item pricing is needed.

## Database Changes

### New Column Added
- **Column Name**: `pItemPrice`
- **Type**: `DECIMAL(10,2)`
- **Default**: `0.00`
- **Position**: After `productPrice` column
- **Purpose**: Store the individual product price for each order item

### Migration Applied
- ✅ Column added to `orders` table
- ✅ Existing orders updated with `pItemPrice` values (copied from `productPrice`)
- ✅ 19 existing orders updated successfully

## Code Changes

### 1. Order Creation Process
**File**: `backend/models/orderModel.js`
- Updated `createOrderFromCart()` function to include `pItemPrice` in INSERT statement
- `pItemPrice` is set to the same value as `productPrice` for each order item

### 2. New API Endpoint
**File**: `backend/controllers/orderController.js`
- Added `getDetailedOrders()` function
- **Route**: `GET /api/order/user/:uid/orders/detailed`
- Returns detailed order information including `pItemPrice` and calculated `itemTotal`

### 3. Enhanced Order Retrieval
**File**: `backend/models/orderModel.js`
- Added `getDetailedOrdersByUser()` function
- Includes `pItemPrice` and calculated `itemTotal` (units × pItemPrice)
- Joins with products table to get SKU information

### 4. Router Updates
**File**: `backend/routers/orderRouter.js`
- Added route for detailed orders: `GET /user/:uid/orders/detailed`

## API Usage

### Regular Orders (Existing)
```
GET /api/order/user/:uid/orders
```
Returns all order data including `pItemPrice` field.

### Detailed Orders (New)
```
GET /api/order/user/:uid/orders/detailed
```
Returns detailed order information with:
- All order fields including `pItemPrice`
- Product SKU information
- Calculated `itemTotal` (units × pItemPrice)

## Data Structure

### Order Item with pItemPrice
```json
{
  "orderID": "ORD_1761135981447_ROQOOM",
  "productID": "PROD_123",
  "productName": "Test Product",
  "units": 10,
  "productPrice": "900.00",
  "pItemPrice": "900.00",
  "itemTotal": "9000.00",
  "sku": "SKU123",
  "orderStatus": "pending",
  "createdAt": "2024-01-20T10:30:00.000Z"
}
```

## Benefits

1. **Individual Item Pricing**: Each order item now has its own price stored
2. **Order History Display**: Can show individual item amounts in user profile
3. **Price History**: Preserves the price at the time of order (even if product price changes later)
4. **Calculated Totals**: Easy calculation of item totals (units × pItemPrice)
5. **Backward Compatibility**: Existing functionality continues to work

## Testing

✅ Column added successfully
✅ Existing data migrated (19 orders updated)
✅ New order creation includes pItemPrice
✅ API endpoints working correctly
✅ No linting errors

## Usage in Frontend

The frontend can now use the `pItemPrice` field to display individual item amounts:

```javascript
// Example usage in order history
order.items.forEach(item => {
  const itemAmount = item.units * item.pItemPrice;
  console.log(`${item.productName}: ${item.units} × ₹${item.pItemPrice} = ₹${itemAmount}`);
});
```

## Migration Status

- ✅ Database schema updated
- ✅ Existing data migrated
- ✅ Code updated to use pItemPrice
- ✅ API endpoints created
- ✅ Testing completed

The implementation is complete and ready for production use.
