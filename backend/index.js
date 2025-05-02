const express = require('express');
const { Pool } = require('pg');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);
const app = express();
const port = 5000;

// Configure multer for file uploads
const upload = multer({ dest: '/tmp/uploads/' });

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
    // Check if transaction_type ENUM exists and has correct values
    const enumCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'transaction_type'
      ) AS type_exists;
    `);

    if (enumCheck.rows[0].type_exists) {
      // Verify ENUM values
      const enumValues = await pool.query(`
        SELECT e.enumlabel
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'transaction_type'
        ORDER BY e.enumsortorder;
      `);
      const expectedValues = ['Cash In', 'Cash Out', 'Load'];
      const currentValues = enumValues.rows.map(row => row.enumlabel);
      
      if (JSON.stringify(currentValues) !== JSON.stringify(expectedValues)) {
        // Drop and recreate ENUM only if values are incorrect
        await pool.query(`
          DROP TYPE transaction_type CASCADE;
          CREATE TYPE transaction_type AS ENUM ('Cash In', 'Cash Out', 'Load');
        `);
      }
    } else {
      // Create ENUM if it doesn't exist
      await pool.query(`
        CREATE TYPE transaction_type AS ENUM ('Cash In', 'Cash Out', 'Load');
      `);
    }

    // Create Transactions table if it doesn't exist
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

    // Create CurrentBalance table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS CurrentBalance (
        id SERIAL PRIMARY KEY,
        balance DECIMAL NOT NULL DEFAULT 0.00
      );
    `);

    // Initialize CurrentBalance if empty
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
  const { date, search, searchField, sortBy, order, limit } = req.query;
  try {
    let query = 'SELECT * FROM Transactions';
    const queryParams = [];
    let paramIndex = 1;
    let conditions = [];

    if (date) {
      conditions.push(`date = $${paramIndex}`);
      queryParams.push(date);
      paramIndex++;
    }

    if (search && searchField) {
      const allowedFields = ['id', 'date', 'time', 'type', 'amount', 'name', 'ref', 'fee', 'remarks'];
      if (!allowedFields.includes(searchField)) {
        return res.status(400).json({ error: `Invalid searchField. Must be one of: ${allowedFields.join(', ')}` });
      }

      const searchTerm = `%${search}%`;
      let condition;

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

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    if (sortBy) {
      const allowedSortFields = ['id', 'time', 'type', 'amount', 'name', 'ref', 'fee', 'remarks'];
      if (!allowedSortFields.includes(sortBy)) {
        return res.status(400).json({ error: `Invalid sortBy field. Must be one of: ${allowedSortFields.join(', ')}` });
      }
      query += ` ORDER BY ${sortBy}`;
      if (order && order.toLowerCase() === 'desc') {
        query += ' DESC';
      } else {
        query += ' ASC';
      }
    } else {
      query += ' ORDER BY id DESC';
    }

    if (limit) {
      query += ` LIMIT ${parseInt(limit)}`;
    }

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
  const remarkUpper = remark.toUpperCase();
  if (remarkUpper.includes('MAYA')) return '#006400';
  if (remarkUpper.includes('BILLS PAYMENT')) return '#008000';
  if (remarkUpper.includes('CLAIMED') || remarkUpper.includes('CLAIM')) return '#90EE90';
  if (remarkUpper.includes('CUANA')) return '#FFFF00';
  if (remarkUpper.includes('LOAD')) return '#FFDAB9';
  if (remarkUpper.includes('SENT')) return '#ADD8E6';
  if (remarkUpper.includes('UNPAID') || remarkUpper.includes('UNCLAIMED')) return '#FFCCCB';
  return '#FFFFFF';
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

    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="transaction-summary-${date}.pdf"`);

    doc.pipe(res);

    doc.fontSize(16).text('GCash Transactions Summary', { align: 'center' });
    doc.moveDown(0.5);

    const startY = doc.y;
    const lineSpacing = 10;
    doc.fontSize(10);

    doc.text(`Date: ${date}`, 30, startY);
    doc.text(`Total Transactions: ${totalTransactions}`, 30, startY + lineSpacing);
    doc.text(`Total Fee (PHP): ${totalFee.toFixed(2)}`, 30, startY + 2 * lineSpacing);

    const rightColumnX = 300;
    doc.text('Breakdown by Type:', rightColumnX, startY);
    let typeY = startY + lineSpacing;
    Object.entries(totalsByType).forEach(([type, fee]) => {
      doc.text(`${type}: ${fee.toFixed(2)} PHP`, rightColumnX, typeY);
      typeY += lineSpacing;
    });

    doc.moveDown(1);

    doc.fontSize(12).text('Detailed Transactions', { align: 'center' });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const colWidths = [30, 70, 50, 50, 50, 60, 60, 40, 70];
    const headers = ['ID', 'Date', 'Time', 'Type', 'Amount', 'Name', 'Ref', 'Fee', 'Remarks'];
    let xPos = 30;

    doc.fontSize(8).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.rect(xPos, tableTop, colWidths[i], 20).fillAndStroke('#007bff', '#000000');
      doc.fillColor('white').text(header, xPos + 2, tableTop + 6, { width: colWidths[i], align: 'center' });
      xPos += colWidths[i];
    });

    doc.font('Helvetica').fillColor('black');
    let yPos = tableTop + 20;
    transactions.forEach((txn, index) => {
      if (yPos > doc.page.height - 50) {
        doc.addPage();
        yPos = 30;
        xPos = 30;
        doc.fontSize(8).font('Helvetica-Bold');
        headers.forEach((header, i) => {
          doc.rect(xPos, yPos, colWidths[i], 20).fillAndStroke('#007bff', '#000000');
          doc.fillColor('white').text(header, xPos + 2, yPos + 6, { width: colWidths[i], align: 'center' });
          xPos += colWidths[i];
        });
        doc.font('Helvetica').fillColor('black');
        yPos += 20;
      }

      xPos = 30;
      const row = [
        txn.id.toString(),
        txn.date,
        txn.time.split(':').slice(0, 2).join(':'),
        txn.type,
        txn.amount.toString(),
        txn.name,
        txn.ref,
        txn.fee.toString(),
        txn.remarks,
      ];

      const remarksColor = getRemarksColor(txn.remarks);

      row.forEach((cell, i) => {
        if (i === 8) {
          doc.rect(xPos, yPos, colWidths[i], 15).fillAndStroke(remarksColor, '#000000');
          
          let fontSize = 8;
          doc.font('Helvetica-Bold').fontSize(fontSize);
          let textWidth = doc.widthOfString(cell);
          const maxWidth = colWidths[i] - 4;
          while (textWidth > maxWidth && fontSize > 4) {
            fontSize -= 0.5;
            doc.fontSize(fontSize);
            textWidth = doc.widthOfString(cell);
          }
          
          doc.fillColor('black').text(cell, xPos + 2, yPos + 3, { width: colWidths[i], align: 'center' });
        } else {
          doc.rect(xPos, yPos, colWidths[i], 15).stroke();
          doc.font('Helvetica').fontSize(8).text(cell, xPos + 2, yPos + 3, { width: colWidths[i], align: 'center' });
        }
        xPos += colWidths[i];
      });

      yPos += 15;
    });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate transaction summary PDF' });
  }
});

app.get('/api/reports/monthly-transactions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        TO_CHAR(TO_DATE(date, 'YYYY-MM-DD'), 'YYYY-MM') AS month,
        COUNT(*) AS total_transactions,
        SUM(CAST(amount AS DECIMAL)) AS total_amount,
        SUM(CAST(fee AS DECIMAL)) AS total_fee
      FROM Transactions
      GROUP BY TO_CHAR(TO_DATE(date, 'YYYY-MM-DD'), 'YYYY-MM')
      ORDER BY month DESC
    `);

    const monthlyTransactions = result.rows.map(row => ({
      month: row.month,
      totalTransactions: parseInt(row.total_transactions),
      totalAmount: parseFloat(row.total_amount),
      totalFee: parseFloat(row.total_fee),
    }));

    res.status(200).json({ monthlyTransactions });
  } catch (error) {
    console.error('Error fetching monthly transactions:', error);
    res.status(500).json({ error: 'Failed to fetch monthly transactions' });
  }
});

app.get('/api/reports/fee-comparison', async (req, res) => {
  try {
    const thisMonth = '2025-04';
    const lastMonth = '2025-03';

    const thisMonthResult = await pool.query(`
      SELECT SUM(CAST(fee AS DECIMAL)) AS total_fee
      FROM Transactions
      WHERE TO_CHAR(TO_DATE(date, 'YYYY-MM-DD'), 'YYYY-MM') = $1
    `, [thisMonth]);

    const lastMonthResult = await pool.query(`
      SELECT SUM(CAST(fee AS DECIMAL)) AS total_fee
      FROM Transactions
      WHERE TO_CHAR(TO_DATE(date, 'YYYY-MM-DD'), 'YYYY-MM') = $1
    `, [lastMonth]);

    const thisMonthFee = thisMonthResult.rows[0].total_fee ? parseFloat(thisMonthResult.rows[0].total_fee) : 0;
    const lastMonthFee = lastMonthResult.rows[0].total_fee ? parseFloat(lastMonthResult.rows[0].total_fee) : 0;

    res.status(200).json({ thisMonthFee, lastMonthFee });
  } catch (error) {
    console.error('Error fetching fee comparison:', error);
    res.status(500).json({ error: 'Failed to fetch fee comparison' });
  }
});

// Backup endpoint
app.get('/api/backup', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `gcash_backup_${timestamp}.sql`;
    const backupFilePath = path.join('/app/backups', backupFileName);

    // Ensure the backups directory exists
    const backupDir = '/app/backups';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Use pg_dump to create a backup
    const pgDumpCommand = `pg_dump -h postgres -U kfa -d gcash_db > ${backupFilePath}`;
    await execPromise(pgDumpCommand, { env: { ...process.env, PGPASSWORD: 'root' } });

    // Check if the backup file was created
    if (!fs.existsSync(backupFilePath)) {
      throw new Error('Backup file was not created');
    }

    // Explicitly set headers and send the file
    res.setHeader('Content-Disposition', `attachment; filename="${backupFileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.sendFile(backupFilePath, (err) => {
      if (err) {
        console.error('Error sending backup file:', err);
        res.status(500).json({ error: 'Failed to download backup file' });
      }
      console.log(`Backup file retained at: ${backupFilePath}`);
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Restore endpoint
app.post('/api/restore', upload.single('backupFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No backup file uploaded' });
    }

    const backupFilePath = req.file.path;

    // Restore the database using psql without dropping the schema
    const psqlCommand = `psql -h postgres -U kfa -d gcash_db < ${backupFilePath}`;
    await execPromise(psqlCommand, { env: { ...process.env, PGPASSWORD: 'root' } });

    // Clean up the uploaded file
    fs.unlink(backupFilePath, (unlinkErr) => {
      if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
    });

    res.status(200).json({ message: 'Database restored successfully' });
  } catch (error) {
    console.error('Error restoring database:', error);
    res.status(500).json({ error: 'Failed to restore database' });
  }
});

// New Endpoint: Transaction Trends (Last 7 Days)
app.get('/api/reports/trend', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const today = new Date();
    const dates = [];
    const results = [];

    // Generate the last `days` dates
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      dates.push(dateStr);
      results.push({ date: dateStr, totalAmount: 0 });
    }

    // Query transactions for the last `days` days
    const query = `
      SELECT date, SUM(CAST(amount AS DECIMAL)) as total_amount
      FROM Transactions
      WHERE date >= $1
      GROUP BY date
      ORDER BY date ASC
    `;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (days - 1));
    const startDateStr = startDate.toISOString().split('T')[0];
    const queryResult = await pool.query(query, [startDateStr]);

    // Map the results to the dates array
    queryResult.rows.forEach(row => {
      const index = dates.indexOf(row.date);
      if (index !== -1) {
        results[index].totalAmount = parseFloat(row.total_amount) || 0;
      }
    });

    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching trend data:', error);
    res.status(500).json({ error: 'Failed to fetch trend data' });
  }
});

// New Endpoint: Transaction Type Breakdown
app.get('/api/reports/type-breakdown', async (req, res) => {
  try {
    const query = `
      SELECT type, COUNT(*) as count
      FROM Transactions
      GROUP BY type
    `;
    const result = await pool.query(query);

    const breakdown = {
      "Cash In": 0,
      "Cash Out": 0,
      "Load": 0
    };
    result.rows.forEach(row => {
      if (breakdown.hasOwnProperty(row.type)) {
        breakdown[row.type] = parseInt(row.count);
      }
    });

    res.status(200).json(breakdown);
  } catch (error) {
    console.error('Error fetching type breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch type breakdown' });
  }
});

// Updated Endpoint: User Transactions Report with Pagination and Search
app.get('/api/reports/user-transactions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    // Query for paginated user transactions with optional search
    let query = `
      SELECT 
        name,
        SUM(CASE WHEN type = 'Cash In' THEN 1 ELSE 0 END) AS cash_in_count,
        SUM(CASE WHEN type = 'Cash Out' THEN 1 ELSE 0 END) AS cash_out_count,
        SUM(CASE WHEN type = 'Load' THEN 1 ELSE 0 END) AS load_count,
        MAX(date) AS last_transaction
      FROM Transactions
    `;
    let countQuery = `
      SELECT COUNT(DISTINCT name) AS total_users
      FROM Transactions
    `;
    const queryParams = [];
    const countParams = [];

    if (search) {
      query += ` WHERE name ILIKE $1`;
      countQuery += ` WHERE name ILIKE $1`;
      queryParams.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    query += `
      GROUP BY name
      ORDER BY name ASC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    queryParams.push(limit, offset);

    // Execute queries
    const [result, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, countParams)
    ]);

    const userTransactions = result.rows.map(row => ({
      name: row.name,
      cashIn: parseInt(row.cash_in_count),
      cashOut: parseInt(row.cash_out_count),
      load: parseInt(row.load_count),
      lastTransaction: row.last_transaction
    }));

    const totalUsers = parseInt(countResult.rows[0].total_users) || 0;

    res.status(200).json({ userTransactions, totalUsers });
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({ error: 'Failed to fetch user transactions' });
  }
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});