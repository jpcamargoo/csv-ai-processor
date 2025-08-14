# 🤖 CSV + IA Processor

Uma aplicação web para processar arquivos CSV usando Inteligência Artificial. Upload, processe e baixe CSVs com conteúdo reescrito, resumido ou expandido.

## 🎯 Funcionalidades

- **Upload de CSV**: Interface simples para enviar arquivos
- **Processamento com IA**: 
  - ✍️ Reescrever (criativo e original)
  - 📝 Resumir (versão concisa)  
  - 📚 Expandir (mais detalhes)
- **Download**: Baixe o CSV processado
- **Preview**: Visualize as primeiras linhas antes de baixar

## 🛠️ Tecnologias

- **Frontend**: HTML + TailwindCSS + Alpine.js
- **Backend**: Node.js + Express
- **IA**: OpenAI API (GPT-3.5-turbo)
- **CSV**: csv-parser, csv-writer
- **Upload**: Multer

## 🚀 Como executar

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione sua chave da OpenAI:
```
OPENAI_API_KEY=sua_chave_da_openai_aqui
```

### 3. Executar a aplicação
```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start
```

### 4. Acessar a aplicação
Abra seu navegador em: http://localhost:3000

## 📁 Estrutura do Projeto

```
.
├── server.js              # Servidor Express principal
├── package.json           # Dependências e scripts
├── public/
│   └── index.html         # Interface web
├── uploads/               # Arquivos temporários (auto-criado)
├── outputs/               # CSVs processados (auto-criado)
├── .env.example           # Exemplo de variáveis de ambiente
└── README.md             # Este arquivo
```

## 📝 Como usar

1. **Prepare seu CSV**: Certifique-se de que a primeira coluna contém o texto a ser processado
2. **Faça upload**: Selecione o arquivo na interface web
3. **Escolha o tipo**: Reescrever, resumir ou expandir
4. **Processe**: Clique em "Processar com IA" e aguarde
5. **Baixe**: Use o link para baixar o CSV processado

## 🔧 API Endpoints

- `GET /` - Interface web principal
- `POST /upload-csv` - Upload e processamento do CSV
- `GET /download/:filename` - Download do arquivo processado

## 💡 Exemplos de uso

### CSV de entrada:
```csv
titulo,autor
"Como a IA está mudando a medicina","João Silva"
```

### CSV processado (reescrita):
```csv
titulo,autor,conteudo_original,conteudo_processado,tipo_processamento,processado_em
"Como a IA está mudando a medicina","João Silva","Como a IA está mudando a medicina","A Revolução da Inteligência Artificial na Área Médica","rewrite","2025-08-14T..."
```

## 🔐 Configuração da OpenAI

1. Crie uma conta em: https://platform.openai.com
2. Gere uma API Key
3. Adicione no arquivo `.env`
4. Certifique-se de ter créditos na conta

## 🐛 Solução de Problemas

### Erro: "Apenas arquivos CSV são permitidos"
- Verifique se o arquivo tem extensão `.csv`

### Erro: "Erro na API de IA"
- Verifique se a chave OpenAI está correta no `.env`
- Confirme se há créditos na conta OpenAI

### Servidor não inicia
- Execute `npm install` novamente
- Verifique se o Node.js está instalado (versão 16+)

## 📄 Licença

MIT License - Sinta-se livre para usar e modificar!
