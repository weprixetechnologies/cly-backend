-- Create visitorData table
CREATE TABLE IF NOT EXISTS visitorData (
    visitorID INT AUTO_INCREMENT PRIMARY KEY,
    visitedOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip VARCHAR(45) NOT NULL,
    INDEX idx_visitedOn (visitedOn),
    INDEX idx_ip (ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

