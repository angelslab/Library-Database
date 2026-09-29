const db = require('./db');

db.query(`
        CREATE TABLE users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50) NOT NULL,
            email VARCHAR(100) NOT NULL,
            role VARCHAR(20) NOT NULL
        )
    `, (err) => {
        if(err) {
            console.error('Error creating users:', err);
            return;
        }

        console.log('Users table created');
    });

db.query(`
        CREATE TABLE book (
            author VARCHAR(100) NOT NULL,
            itemID INT PRIMARY KEY NOT NULL,
            isbn CHAR(13) NOT NULL,
            publication_year INT
        )
    
    `, (err) => {
        if(err) {
            console.error('Error creating books:', err);
            return;
        }

        console.log('Book table created');
    });

db.query(`
        CREATE TABLE device (
            itemID INT PRIMARY KEY NOT NULL,
            device_type VARCHAR(50) NOT NULL
        )
    
    
    `, (err) => {
        if(err) {
            console.error("Error creating devices: ", err);
            return;
        }
        console.log('Device table created');
    })    

db.query(`
        CREATE TABLE faculty(
            userID INT NOT NULL,
            facultyID INT PRIMARY KEY NOT NULL,
            department VARCHAR(50) NOT NULL,
            max_limit INT NOT NULL

        )
    
    
    `, (err) => {
        if(err) {
            console.error("Error creating faculty:", err);
            return;
        }
        console.log('Faculty table created');
    })