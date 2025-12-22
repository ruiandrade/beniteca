-- Adicionar colunas deliveryStatus e assemblyStatus à tabela Material
ALTER TABLE Material
ADD deliveryStatus NVARCHAR(50) NULL,
    assemblyStatus NVARCHAR(50) NULL;

-- Valores possíveis sugeridos:
-- deliveryStatus: 'Pendente', 'Encomendado', 'Em Trânsito', 'Entregue'
-- assemblyStatus: 'Pendente', 'Em Andamento', 'Concluído'
