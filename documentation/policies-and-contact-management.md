# Policies and Contact Management System

## Overview

This documentation covers the implementation of a comprehensive policies and contact management system that allows administrators to manage Terms & Conditions, Privacy Policy, Refund Policy, and Contact Details through admin panels, with elegant user-facing pages.

## Database Schema

### Policies Table

```sql
CREATE TABLE policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('terms_conditions', 'privacy_policy', 'refund_policy') NOT NULL,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL,
    version VARCHAR(50) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT,
    UNIQUE KEY unique_active_policy (type, is_active),
    INDEX idx_type (type),
    INDEX idx_active (is_active)
);
```

### Contact Details Table

```sql
CREATE TABLE contact_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('email', 'phone', 'address', 'social_media', 'other') NOT NULL,
    label VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_active (is_active),
    INDEX idx_display_order (display_order)
);
```

## Backend API Endpoints

### Policies API

#### Public Endpoints (No Authentication Required)

- `GET /api/policies/active` - Get all active policies
- `GET /api/policies/type/:type` - Get active policy by type

#### Admin Endpoints (Authentication Required)

- `GET /api/policies` - Get all policies (admin)
- `GET /api/policies/:id` - Get policy by ID (admin)
- `POST /api/policies` - Create new policy (admin)
- `PUT /api/policies/:id` - Update policy (admin)
- `PUT /api/policies/:id/activate` - Activate policy (admin)
- `DELETE /api/policies/:id` - Delete policy (admin)

### Contact Details API

#### Public Endpoints (No Authentication Required)

- `GET /api/contact/active` - Get all active contact details
- `GET /api/contact/type/:type` - Get contact details by type

#### Admin Endpoints (Authentication Required)

- `GET /api/contact` - Get all contact details (admin)
- `GET /api/contact/:id` - Get contact detail by ID (admin)
- `POST /api/contact` - Create new contact detail (admin)
- `PUT /api/contact/:id` - Update contact detail (admin)
- `PUT /api/contact/display-order` - Update display order (admin)
- `DELETE /api/contact/:id` - Delete contact detail (admin)

## Frontend Implementation

### Admin Panel Pages

#### 1. Policies Management (`/policies`)

**Features:**
- View all policies with version history
- Create new policies
- Edit existing policies
- Activate/deactivate policies
- Delete policies
- Rich text editor for policy content

**Key Components:**
- Policy list with status indicators
- Modal form for creating/editing policies
- Version management
- Activation controls

#### 2. Contact Details Management (`/contact`)

**Features:**
- View all contact details
- Create new contact entries
- Edit existing entries
- Reorder contact details
- Activate/deactivate entries
- Support for multiple contact types

**Key Components:**
- Contact list with drag-and-drop reordering
- Form for creating/editing contacts
- Type-specific icons and validation
- Display order management

### User-Facing Pages

#### 1. Terms and Conditions (`/terms-and-conditions`)

**Design Features:**
- Orange gradient background
- Elegant card layout with shadow
- Print functionality
- Responsive design
- Loading states
- Error handling

#### 2. Privacy Policy (`/privacy-policy`)

**Design Features:**
- Blue gradient background
- Professional layout
- Version information
- Print functionality
- Responsive design

#### 3. Refund Policy (`/refund-policy`)

**Design Features:**
- Green gradient background
- Clean typography
- Easy navigation
- Print functionality

#### 4. Contact Page (`/contact`)

**Design Features:**
- Purple gradient background
- Card-based layout
- Type-specific icons
- Clickable contact links
- Responsive grid
- Additional information section

## Cart Improvements

### Quantity Management

**Features Added:**
- Quantity dropdown selectors for both boxes and units
- Real-time quantity updates
- Loading states during updates
- Validation based on minQty multiples
- Automatic cart refresh after updates

**Implementation:**
- Added `updateCartItem` function to cart service
- Enhanced cart items component with dropdown selectors
- Added loading states and error handling
- Integrated with existing cart merge functionality

## Key Features

### 1. Policy Management
- **Version Control**: Each policy can have multiple versions
- **Activation System**: Only one policy of each type can be active
- **Rich Content**: Support for formatted text content
- **Audit Trail**: Track creation and update history

### 2. Contact Management
- **Multiple Types**: Support for email, phone, address, social media, and other
- **Display Ordering**: Drag-and-drop reordering of contact details
- **Active/Inactive States**: Control visibility of contact details
- **Clickable Links**: Automatic link generation for emails, phones, and URLs

### 3. User Experience
- **Modern Design**: Gradient backgrounds and elegant layouts
- **Responsive**: Works on all device sizes
- **Loading States**: Smooth loading indicators
- **Error Handling**: Graceful error messages
- **Print Support**: Print-friendly layouts

### 4. Cart Enhancements
- **Quantity Selection**: Dropdown selectors for easy quantity changes
- **Real-time Updates**: Immediate cart updates
- **Validation**: Ensures quantities are multiples of minQty
- **Loading States**: Visual feedback during updates

## Security Considerations

1. **Authentication**: Admin endpoints require authentication
2. **Input Validation**: All inputs are validated on both client and server
3. **SQL Injection Prevention**: Using prepared statements
4. **XSS Protection**: Proper content sanitization
5. **CSRF Protection**: Implemented through authentication tokens

## Performance Optimizations

1. **Lazy Loading**: Admin pages use lazy loading for better performance
2. **Caching**: Policies and contact details can be cached
3. **Database Indexing**: Proper indexes for efficient queries
4. **Image Optimization**: Optimized images for user pages

## Usage Examples

### Creating a New Policy

```javascript
// Admin panel
const newPolicy = {
    type: 'terms_conditions',
    title: 'Terms and Conditions',
    content: 'Your terms content here...',
    version: '1.0'
};

await axiosInstance.post('/policies', newPolicy);
```

### Fetching Active Policies

```javascript
// User-facing pages
const response = await axiosInstance.get('/policies/type/terms_conditions');
const policy = response.data.data;
```

### Updating Cart Quantity

```javascript
// Cart functionality
await updateCartItem(productID, { boxQty: 2, units: 5 });
```

## Future Enhancements

1. **Rich Text Editor**: WYSIWYG editor for policy content
2. **Template System**: Pre-built policy templates
3. **Multi-language Support**: Support for multiple languages
4. **Analytics**: Track policy views and contact interactions
5. **Email Integration**: Send notifications for policy updates
6. **Advanced Cart Features**: Save for later, wishlist functionality

## Troubleshooting

### Common Issues

1. **Policy Not Showing**: Check if policy is active and type is correct
2. **Contact Details Not Loading**: Verify contact details are active
3. **Cart Not Updating**: Check authentication and API connectivity
4. **Quantity Validation Errors**: Ensure quantities are multiples of minQty

### Debug Steps

1. Check browser console for errors
2. Verify API endpoints are accessible
3. Check database for data integrity
4. Validate authentication tokens
5. Test with different user roles

## Conclusion

This implementation provides a comprehensive solution for managing policies and contact information with an elegant user interface. The system is designed to be scalable, maintainable, and user-friendly while providing administrators with powerful management tools.
