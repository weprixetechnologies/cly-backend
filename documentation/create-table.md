<!-- -- PRODUCTS TABLE -->
CREATE TABLE products (
    productID       VARCHAR(50) PRIMARY KEY,
    productName     VARCHAR(255) NOT NULL,
    productPrice    DECIMAL(10,2) NOT NULL,
    sku             VARCHAR(100) UNIQUE,
    description     TEXT,
    boxQty          INT DEFAULT 0,
    packQty         INT DEFAULT 0,
    minQty          INT DEFAULT 1,
    categoryID      VARCHAR(50),
    categoryName    VARCHAR(255),
    featuredImages  TEXT,
    galleryImages   JSON,
    status          ENUM('active', 'inactive') DEFAULT 'active',
    syncStatus      ENUM('pending', 'synced', 'failed') DEFAULT 'pending',
    inventory       INT DEFAULT 0,
    createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

<!-- -- USERS TABLE -->
CREATE TABLE users (
    uid            VARCHAR(50) PRIMARY KEY,
    username       VARCHAR(100) UNIQUE NOT NULL,
    name           VARCHAR(255),
    photo          TEXT,
    emailID        VARCHAR(255),
    phoneNumber    VARCHAR(20),
    gstin          VARCHAR(15),
    outstanding    DECIMAL(10,2) DEFAULT 0.00,
    createdAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    lastLogin      DATETIME,
    status         ENUM('active', 'inactive', 'banned') DEFAULT 'active',
    password       VARCHAR(255) NOT NULL,
    cartID         VARCHAR(50),
    role           ENUM('user', 'admin', 'manager') DEFAULT 'user'
);

<!-- -- SESSIONS TABLE -->
CREATE TABLE sessions (
    sessionID      VARCHAR(100) PRIMARY KEY,
    refreshToken   TEXT NOT NULL,
    uid            VARCHAR(50) NOT NULL,
    expiry         DATETIME NOT NULL,
    createdAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    device         VARCHAR(255),
    FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
);

<!-- -- ORDERS TABLE (simplified schema reflecting current backend usage) -->
CREATE TABLE orders (
    orderID         VARCHAR(50) NOT NULL,
    productID       VARCHAR(50) NOT NULL,
    productName     VARCHAR(255) NOT NULL,
    boxes           INT DEFAULT 0,
    units           INT DEFAULT 0,
    requested_units INT DEFAULT 0,
    accepted_units  INT DEFAULT 0,
    acceptance_status ENUM('pending', 'partial', 'full', 'rejected', 'increased') DEFAULT 'pending',
    productPrice    DECIMAL(10,2) DEFAULT 0.00,
    pItemPrice      DECIMAL(10,2) DEFAULT 0.00,
    final_price     DECIMAL(10,2) DEFAULT 0.00,
    order_amount    DECIMAL(10,2) DEFAULT 0.00,
    shipping_charge DECIMAL(10,2) DEFAULT 0.00,
    featuredImage   TEXT,
    uid             VARCHAR(50) NOT NULL,
    addressName     VARCHAR(255),
    addressPhone    VARCHAR(20),
    addressLine1    VARCHAR(255),
    addressLine2    VARCHAR(255),
    addressCity     VARCHAR(100),
    addressState    VARCHAR(100),
    addressPincode  VARCHAR(20),
    paymentMode     VARCHAR(50),
    couponCode      VARCHAR(100),
    payment_status  ENUM('not_paid', 'partially_paid', 'paid') DEFAULT 'not_paid',
    payment_date    DATETIME,
    customer_comment TEXT,
    themeCategory   VARCHAR(255),
    remarks         TEXT,
    remarks_photos  JSON,
    createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (orderID, productID),
    FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE,
    FOREIGN KEY (productID) REFERENCES products(productID) ON DELETE CASCADE
);

<!-- -- CART ITEMS TABLE -->
CREATE TABLE cart_items (
    cartID         VARCHAR(50) NOT NULL,
    productID      VARCHAR(50) NOT NULL,
    productName    VARCHAR(255) NOT NULL,
    boxQty         INT DEFAULT 0,
    packQty        INT DEFAULT 0,
    units          INT DEFAULT 0,
    featuredImage  TEXT,
    uid            VARCHAR(50) NOT NULL,
    createdAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (cartID, productID),
    FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE,
    FOREIGN KEY (productID) REFERENCES products(productID) ON DELETE CASCADE
);

<!-- -- CATEGORIES TABLE -->
CREATE TABLE categories (
    categoryID     VARCHAR(50) PRIMARY KEY,
    categoryName   VARCHAR(255) UNIQUE NOT NULL,
    image          TEXT,
    productCount   INT DEFAULT 0,
    createdAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

<!-- -- VISITOR DATA TABLE -->
CREATE TABLE visitorData (
    visitorID   INT AUTO_INCREMENT PRIMARY KEY,
    visitedOn   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip          VARCHAR(45) NOT NULL,
    INDEX idx_visitedOn (visitedOn),
    INDEX idx_ip (ip)
);

