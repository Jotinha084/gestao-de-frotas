-- =====================================================
-- Gestão de Frotas - Estrutura do banco de dados (MySQL 8)
-- =====================================================

CREATE DATABASE IF NOT EXISTS gestao_frotas
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE gestao_frotas;

-- Veículos
-- O status é controlado pelo sistema (utilizações e manutenções).
CREATE TABLE IF NOT EXISTS veiculos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    placa VARCHAR(10) NOT NULL UNIQUE,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    ano INT,
    quilometragem DECIMAL(10,2) DEFAULT 0,
    tipo_combustivel VARCHAR(30) NOT NULL DEFAULT 'Flex',
    status VARCHAR(20) DEFAULT 'Disponível'
);

-- Motoristas
-- O CPF é opcional e não é usado pela interface.
CREATE TABLE IF NOT EXISTS motoristas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) NULL UNIQUE,
    cnh VARCHAR(20) NOT NULL UNIQUE,
    validade_cnh DATE NOT NULL,
    telefone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'Ativo'
);

-- Utilizações (uma utilização aberta é a que não tem data_retorno)
CREATE TABLE IF NOT EXISTS utilizacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    veiculo_id INT NOT NULL,
    motorista_id INT NOT NULL,
    finalidade VARCHAR(150) NOT NULL,
    data_saida DATETIME NOT NULL,
    data_retorno DATETIME,
    km_inicial DECIMAL(10,2) NOT NULL,
    km_final DECIMAL(10,2),
    destino VARCHAR(150),
    observacoes TEXT,
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id),
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id)
);

-- Abastecimentos
-- O tipo de combustível e o valor por litro são preenchidos pelo servidor.
CREATE TABLE IF NOT EXISTS abastecimentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    veiculo_id INT NOT NULL,
    motorista_id INT,
    data_abastecimento DATETIME NOT NULL,
    tipo_combustivel VARCHAR(30) NOT NULL,
    quantidade_litros DECIMAL(10,2) NOT NULL,
    valor_litro DECIMAL(10,2) NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    quilometragem DECIMAL(10,2) NOT NULL,
    posto VARCHAR(100),
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id),
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id)
);

-- Manutenções (a coluna "valor" guarda o custo)
CREATE TABLE IF NOT EXISTS manutencoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    veiculo_id INT NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    data_manutencao DATETIME NOT NULL,
    quilometragem DECIMAL(10,2) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    oficina VARCHAR(100),
    status VARCHAR(30) DEFAULT 'Concluída',
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id)
);