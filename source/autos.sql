CREATE DATABASE IF NOT EXISTS autosdb;

USE autosdb;

CREATE TABLE autos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    anio INT NOT NULL,
    color VARCHAR(30) NOT NULL,
    precio DECIMAL(10,2) NOT NULL
);

INSERT INTO autos (marca, modelo, anio, color, precio) VALUES
('Toyota', 'Corolla', 2020, 'Blanco', 22000.00),
('Honda', 'Civic', 2021, 'Negro', 24500.00),
('Ford', 'Focus', 2019, 'Azul', 18500.00),
('Chevrolet', 'Cruze', 2018, 'Rojo', 17000.00),
('Nissan', 'Sentra', 2022, 'Gris', 26000.00),
('Hyundai', 'Elantra', 2021, 'Plata', 23000.00),
('Kia', 'Rio', 2020, 'Blanco', 19500.00),
('Volkswagen', 'Jetta', 2019, 'Negro', 21000.00),
('Mazda', 'Mazda3', 2022, 'Rojo', 27500.00),
('Subaru', 'Impreza', 2021, 'Azul', 25000.00),
('Renault', 'Logan', 2018, 'Gris', 14500.00),
('Peugeot', '208', 2020, 'Amarillo', 18000.00),
('Fiat', 'Cronos', 2021, 'Blanco', 19000.00),
('Mitsubishi', 'Lancer', 2019, 'Verde', 20000.00),
('Suzuki', 'Swift', 2022, 'Rojo', 21500.00);