const express = require('express');
const { Pool } = require('pg');
const PDFDocument = require('pdfkit');
const app = express();
const port = 5000;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

console.log('DATABASE_URL:', process.env.DATABASE_URL);
if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect((err) => {
  if (err) {
    console.error('Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  }
  console.log('Successfully connected to PostgreSQL');
});

async function initializeDatabase() {
  try {
    await pool.query(`
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
          DROP TYPE transaction_type CASCADE;
        END IF;
        CREATE TYPE transaction_type AS ENUM ('Cash In', 'Cash Out', 'Load');
      END $$;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS Transactions (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        type transaction_type NOT NULL,
        amount TEXT NOT NULL,
        name TEXT NOT NULL,
        ref TEXT NOT NULL,
        fee TEXT NOT NULL,
        remarks TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add created_at and updated_at columns if they don't exist
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'transactions' AND column_name = 'created_at') THEN
          ALTER TABLE Transactions ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'transactions' AND column_name = 'updated_at') THEN
          ALTER TABLE Transactions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
      END $$;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS CurrentBalance (
        id SERIAL PRIMARY KEY,
        balance DECIMAL NOT NULL DEFAULT 0.00
      );
    `);

    const balanceCheck = await pool.query('SELECT * FROM CurrentBalance');
    if (balanceCheck.rows.length === 0) {
      await pool.query('INSERT INTO CurrentBalance (balance) VALUES (0.00)');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

initializeDatabase();

async function updateBalanceBasedOnTransaction(type, amount, operation = 'subtract') {
  try {
    const amountNum = parseFloat(amount) || 0;
    let balanceChange = 0;

    if (type === 'Cash In' || type === 'Load') {
      balanceChange = -amountNum;
    } else if (type === 'Cash Out') {
      balanceChange = amountNum;
    }

    if (operation === 'add') {
      balanceChange = -balanceChange;
    }

    if (balanceChange !== 0) {
      await pool.query(
        'UPDATE CurrentBalance SET balance = balance + $1 WHERE id = 1',
        [balanceChange]
      );
    }
  } catch (error) {
    console.error('Failed to update balance:', error);
    throw error;
  }
}

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Backend is running!' });
});

app.get('/api/balance', async (req, res) => {
  try {
    const result = await pool.query('SELECT balance FROM CurrentBalance WHERE id = 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Balance not found' });
    }
    res.status(200).json({ balance: result.rows[0].balance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

app.post('/api/balance', async (req, res) => {
  const { balance } = req.body;
  if (typeof balance !== 'number' || balance < 0) {
    return res.status(400).json({ error: 'Balance must be a positive number' });
  }

  try {
    await pool.query(
      'UPDATE CurrentBalance SET balance = $1 WHERE id = 1',
      [balance]
    );
    res.status(200).json({ message: 'Balance updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to set balance' });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const { date, time, type, amount, name, ref, fee, remarks } = req.body;
    const result = await pool.query(
      `INSERT INTO Transactions (date, time, type, amount, name, ref, fee, remarks, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [date, time, type, amount, name, ref, fee, remarks]
    );

    await updateBalanceBasedOnTransaction(type, amount, 'subtract');

    res.status(200).json({ message: 'Transaction saved', id: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save transaction' });
  }
});

app.get('/api/transactions', async (req, res) => {
  const { date, search, searchField } = req.query;
  try {
    let query = 'SELECT * FROM Transactions';
    const queryParams = [];
    let paramIndex = 1;
    let conditions = [];

    // Add date filter if provided
    if (date) {
      conditions.push(`date = $${paramIndex}`);
      queryParams.push(date);
      paramIndex++;
    }

    // Add search filter if provided, searching only in the specified field
    if (search && searchField) {
      const allowedFields = ['id', 'date', 'time', 'type', 'amount', 'name', 'ref', 'fee', 'remarks'];
      if (!allowedFields.includes(searchField)) {
        return res.status(400).json({ error: `Invalid searchField. Must be one of: ${allowedFields.join(', ')}` });
      }

      const searchTerm = `%${search}%`;
      let condition;

      // Special handling for fields that need casting
      if (searchField === 'id') {
        condition = `CAST(id AS TEXT) ILIKE $${paramIndex}`;
      } else if (searchField === 'type') {
        condition = `type::TEXT ILIKE $${paramIndex}`;
      } else {
        condition = `${searchField} ILIKE $${paramIndex}`;
      }

      conditions.push(condition);
      queryParams.push(searchTerm);
    }

    // Combine conditions into the WHERE clause
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Always sort by id in ascending order
    query += ' ORDER BY id ASC';

    const result = await pool.query(query, queryParams);
    const transactions = result.rows || [];
    const totalFee = transactions.reduce((sum, txn) => sum + (parseFloat(txn.fee) || 0), 0);
    res.status(200).json({ transactions, totalFee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const transactionResult = await pool.query('SELECT * FROM Transactions WHERE id = $1', [id]);
    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    const transaction = transactionResult.rows[0];

    await updateBalanceBasedOnTransaction(transaction.type, transaction.amount, 'add');

    await pool.query('DELETE FROM Transactions WHERE id = $1', [id]);
    res.status(200).json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

app.put('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  const { date, time, type, amount, name, ref, fee, remarks } = req.body;

  if (!date || !time || !type || !amount || !name || !ref || !fee || !remarks) {
    return res.status(400).json({ error: 'All fields (date, time, type, amount, name, ref, fee, remarks) are required' });
  }

  try {
    const originalResult = await pool.query('SELECT * FROM Transactions WHERE id = $1', [id]);
    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    const originalTransaction = originalResult.rows[0];

    await updateBalanceBasedOnTransaction(originalTransaction.type, originalTransaction.amount, 'add');

    await pool.query(
      `UPDATE Transactions 
       SET date = $1, time = $2, type = $3, amount = $4, name = $5, ref = $6, fee = $7, remarks = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9`,
      [date, time, type, amount, name, ref, fee, remarks, id]
    );

    await updateBalanceBasedOnTransaction(type, amount, 'subtract');

    res.status(200).json({ message: 'Transaction updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

function getRemarksColor(remark) {
  switch (remark.toUpperCase()) {
    case 'SENT': return '#ADD8E6';
    case 'CLAIMED': return '#90EE90';
    case 'LOAD': return '#FFDAB9';
    case 'CUANA': return '#FFFFE0';
    case 'UNPAID': return '#FFCCCB';
    default: return '#FFFFFF';
  }
}

app.get('/api/transactions/download', async (req, res) => {
  const { date, sortBy } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Date query parameter is required' });
  }

  try {
    let query = 'SELECT * FROM Transactions WHERE date = $1';
    if (sortBy) {
      const allowedSortFields = ['id', 'time', 'type', 'amount', 'name', 'ref', 'fee', 'remarks'];
      if (!allowedSortFields.includes(sortBy)) {
        return res.status(400).json({ error: `Invalid sortBy field. Must be one of: ${allowedSortFields.join(', ')}` });
      }
      query += ` ORDER BY ${sortBy}`;
    } else {
      query += ' ORDER BY id ASC';
    }

    const result = await pool.query(query, [date]);
    const transactions = result.rows || [];
    const totalFee = transactions.reduce((sum, txn) => sum + (parseFloat(txn.fee) || 0), 0);
    const totalTransactions = transactions.length;

    const totalsByType = transactions.reduce((acc, txn) => {
      const fee = parseFloat(txn.fee) || 0;
      acc[txn.type] = (acc[txn.type] || 0) + fee;
      return acc;
    }, {});

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="transaction-summary-${date}.pdf"`);

    doc.pipe(res);

    doc.fontSize(20).text('GCash Transactions Summary', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text(`Date: ${date}`);
    doc.text(`Total Transactions: ${totalTransactions}`);
    doc.text(`Total Fee (PHP): ${totalFee.toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(12).text('Breakdown by Type:');
    Object.entries(totalsByType).forEach(([type, fee]) => {
      doc.text(`${type}: ${fee.toFixed(2)} PHP`);
    });
    doc.moveDown(2);

    if (transactions.length > 0) {
      doc.fontSize(16).text('Detailed Transactions', { align: 'center' });
      doc.moveDown();

      const headers = ['ID', 'Date', 'Time', 'Type', 'Amount', 'Name', 'Ref', 'Fee', 'Remarks'];
      const colWidths = [50, 80, 60, 60, 60, 80, 60, 50, 80];
      const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
      const pageWidth = 612 - 100;
      const startX = (pageWidth - tableWidth) / 2 + 50;
      const rowHeight = 20;
      const headerHeight = 20;
      let x = startX;
      let y = doc.y;

      doc.fontSize(10).font('Helvetica-Bold');
      headers.forEach((header, i) => {
        doc.text(header, x, y + 5, { width: colWidths[i], align: 'center' });
        x += colWidths[i];
      });

      x = startX;
      headers.forEach((_, i) => {
        doc.rect(x, y, colWidths[i], headerHeight)
           .lineWidth(1)
           .strokeColor('#000000')
           .stroke();
        x += colWidths[i];
      });

      y += headerHeight;

      let currentPageRows = 0;

      doc.font('Helvetica');
      transactions.forEach((txn, index) => {
        x = startX;

        doc.text(txn.id.toString(), x, y + 5, { width: colWidths[0], align: 'center' }); x += colWidths[0];
        doc.text(txn.date, x, y + 5, { width: colWidths[1], align: 'center' }); x += colWidths[1];
        doc.text(txn.time, x, y + 5, { width: colWidths[2], align: 'center' }); x += colWidths[2];
        doc.text(txn.type, x, y + 5, { width: colWidths[3], align: 'center' }); x += colWidths[3];
        doc.text(txn.amount, x, y + 5, { width: colWidths[4], align: 'center' }); x += colWidths[4];
        doc.text(txn.name, x, y + 5, { width: colWidths[5], align: 'center' }); x += colWidths[5];
        doc.text(txn.ref, x, y + 5, { width: colWidths[6], align: 'center' }); x += colWidths[6];
        doc.text(txn.fee, x, y + 5, { width: colWidths[7], align: 'center' }); x += colWidths[7];

        const remarksBgColor = getRemarksColor(txn.remarks);
        doc.rect(x, y, colWidths[8], rowHeight).fill(remarksBgColor).fillColor('black');
        doc.text(txn.remarks, x + 2, y + 5, { width: colWidths[8] - 4, align: 'center' });

        x = startX;
        for (let i = 0; i < colWidths.length; i++) {
          doc.rect(x, y, colWidths[i], rowHeight)
             .lineWidth(0.5)
             .strokeColor('#000000')
             .stroke();
          x += colWidths[i];
        }

        y += rowHeight;
        currentPageRows++;

        if (y > 700 && index < transactions.length - 1) {
          doc.addPage();
          y = 50;
          currentPageRows = 0;
          x = startX;

          doc.fontSize(10).font('Helvetica-Bold');
          headers.forEach((header, i) => {
            doc.text(header, x, y + 5, { width: colWidths[i], align: 'center' });
            x += colWidths[i];
          });

          x = startX;
          headers.forEach((_, i) => {
            doc.rect(x, y, colWidths[i], headerHeight)
               .lineWidth(1)
               .strokeColor('#000000')
               .stroke();
            x += colWidths[i];
          });

          y += headerHeight;
          doc.font('Helvetica');
        }
      });
    }

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate transaction summary PDF' });
  }
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});