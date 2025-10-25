# Complete Orders Table Schema

This document describes the complete schema of the `orders` table after all migrations have been applied.

## Orders Table Structure

The `orders` table now contains the following columns:

### Primary Keys and Identifiers
- `id` - Auto-increment primary key
- `orderID` - Unique order identifier (VARCHAR(50))
- `productID` - Product identifier (VARCHAR(50))
- `uid` - User identifier (VARCHAR(50))

### Product Information
- `productName` - Name of the product (VARCHAR(255))
- `productPrice` - Price per unit (DECIMAL(10,2))
- `featuredImage` - Product image URL (TEXT)

### Quantity Information
- `boxes` - Number of boxes (INT, default: 0)
- `packQty` - Pack quantity (INT, default: 0)
- `units` - Number of units (INT, default: 0)
- `requested_units` - Units requested by user (INT, default: 0)
- `accepted_units` - Units accepted by admin (INT, default: 0)

### Order Status and Management
- `orderStatus` - Order status (ENUM: 'pending', 'accepted', 'rejected', default: 'pending')
- `acceptance_status` - Acceptance status (ENUM: 'pending', 'partial', 'full', 'rejected', default: 'pending')
- `admin_notes` - Admin notes (TEXT)
- `remarks` - Order remarks (TEXT)

### Address Information
- `addressName` - Delivery name (VARCHAR(255))
- `addressPhone` - Delivery phone (VARCHAR(20))
- `addressLine1` - Address line 1 (TEXT)
- `addressLine2` - Address line 2 (TEXT)
- `addressCity` - City (VARCHAR(100))
- `addressState` - State (VARCHAR(100))
- `addressPincode` - Pincode (VARCHAR(10))

### Payment Information
- `paymentMode` - Payment mode (ENUM: 'COD', 'PREPAID', 'PHONEPE', default: 'COD')
- `payment_status` - Payment status (ENUM: 'paid', 'not_paid', 'partially_paid', default: 'not_paid')
- `payment_date` - Payment date (DATETIME)
- `payment_reference` - Payment reference (VARCHAR(255))
- `order_amount` - Total order amount (DECIMAL(10,2), default: 0.00)
- `couponCode` - Coupon code used (VARCHAR(50))

### Timestamps
- `createdAt` - Creation timestamp (TIMESTAMP, default: CURRENT_TIMESTAMP)
- `updatedAt` - Last update timestamp (TIMESTAMP, default: CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)

## Indexes

The following indexes have been created for better performance:

- `idx_orders_uid` - Index on `uid` column
- `idx_orders_status` - Index on `orderStatus` column
- `idx_orders_payment_status` - Index on `payment_status` column
- `idx_orders_acceptance_status` - Index on `acceptance_status` column
- `idx_orders_amount` - Index on `order_amount` column
- `idx_orders_created_at` - Index on `createdAt` column

## Order Payments Table

The `order_payments` table tracks payment transactions:

- `id` - Auto-increment primary key
- `orderID` - Order identifier (VARCHAR(255))
- `paid_amount` - Amount paid (DECIMAL(10,2), default: 0.00)
- `payment_date` - Payment date (DATETIME, default: CURRENT_TIMESTAMP)
- `payment_reference` - Payment reference (VARCHAR(255))
- `admin_uid` - Admin who processed payment (VARCHAR(255))
- `notes` - Payment notes (TEXT)
- `createdAt` - Creation timestamp (TIMESTAMP, default: CURRENT_TIMESTAMP)
- `updatedAt` - Last update timestamp (TIMESTAMP, default: CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)

## Usage

This complete schema supports:

1. **Order Management**: Full order lifecycle from creation to completion
2. **Payment Tracking**: Detailed payment status and transaction history
3. **Address Management**: Complete delivery address information
4. **Admin Controls**: Notes, remarks, and acceptance management
5. **User Statistics**: Support for calculating user order statistics
6. **Audit Trail**: Complete timestamp tracking for all operations

## Migration Status

✅ All necessary columns have been created
✅ All indexes have been added
✅ Default values have been set
✅ Foreign key constraints are in place
✅ Order payments table exists and is properly configured

The orders table is now fully functional and ready for production use.
