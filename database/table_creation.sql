CREATE TABLE users (
    user_id VARCHAR(255) NOT NULL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    firstname VARCHAR(255) NOT NULL,
    lastname VARCHAR(255) NOT NULL
);

CREATE TABLE documents (
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    bucket VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    doc_type VARCHAR(255) NOT NULL,
    upload_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(255) NULL,
    device VARCHAR(63) NULL,
    ip VARCHAR(127) NULL,
    PRIMARY KEY (filename, bucket),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);