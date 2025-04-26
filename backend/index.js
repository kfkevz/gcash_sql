// Set default date to today
const today = new Date().toISOString().split('T')[0];
document.getElementById('date').value = today;
document.getElementById('fetchDate').value = today;

// Automatically fetch transactions for the selected date when the page loads
window.onload = function() {
  console.log('Page loaded, fetching transactions...');
  fetchTransactions();
};

// Add transaction
document.getElementById('transactionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const transaction = {
    date: document.getElementById('date').value,
    time: document.getElementById('time').value,
    type: document.getElementById('type').value,
    amount: document.getElementById('amount').value,
    name: document.getElementById('name').value,
    ref: document.getElementById('ref').value,
    fee: document.getElementById('fee').value,
    remarks: document.getElementById('remarks').value,
  };

  try {
    console.log('Submitting transaction:', transaction);
    const response = await fetch('http://localhost:5000/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
    });
    const result = await response.json();
    if (response.ok) {
      alert('Transaction saved successfully!');
      // Reset form
      document.getElementById('transactionForm').reset();
      document.getElementById('date').value = today;
      document.getElementById('type').value = ''; // Reset dropdown
      // Refresh the transaction list for the selected date
      fetchTransactions();
    } else {
      console.error('Error saving transaction:', result.error);
      alert(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error('Failed to save transaction:', error);
    alert('Failed to save transaction');
  }
});

// Fetch transactions for the selected date
async function fetchTransactions() {
  const selectedDate = document.getElementById('fetchDate').value;
  const tbody = document.getElementById('transactionsBody');
  const totalFeeDiv = document.getElementById('totalFee');
  const tableErrorDiv = document.getElementById('tableError');

  // If no date is selected, clear the table and return
  if (!selectedDate) {
    console.log('No date selected, clearing table');
    tbody.innerHTML = '';
    totalFeeDiv.textContent = '';
    tableErrorDiv.style.display = 'none';
    return;
  }

  try {
    console.log(`Fetching transactions for date: ${selectedDate}`);
    const response = await fetch(`http://localhost:5000/api/transactions?date=${selectedDate}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const { transactions, totalFee } = await response.json();
    console.log('Transactions received:', transactions);

    tbody.innerHTML = ''; // Clear existing rows
    if (transactions.length === 0) {
      console.log('No transactions found for the selected date');
      tbody.innerHTML = '<tr><td colspan="10">No transactions found</td></tr>';
    } else {
      transactions.forEach(txn => {
        const row = document.createElement('tr');
        // Format time to HH:mm (remove seconds, ensure 24-hour format)
        const timeParts = txn.time.split(':'); // e.g., "17:30:00" -> ["17", "30", "00"]
        const formattedTime = `${timeParts[0]}:${timeParts[1]}`; // e.g., "17:30"
        // Determine the class for the Remarks column based on its value
        let remarksClass = '';
        switch (txn.remarks.toUpperCase()) {
          case 'SENT':
            remarksClass = 'remarks-sent';
            break;
          case 'CLAIMED':
            remarksClass = 'remarks-claimed';
            break;
          case 'LOAD':
            remarksClass = 'remarks-load';
            break;
          case 'CUANA':
            remarksClass = 'remarks-cuana';
            break;
          case 'UNPAID':
            remarksClass = 'remarks-unpaid';
            break;
          default:
            remarksClass = '';
        }
        row.innerHTML = `
          <td>${txn.id}</td>
          <td>${txn.date}</td>
          <td>${formattedTime}</td>
          <td>${txn.type}</td>
          <td>${txn.amount}</td>
          <td>${txn.name}</td>
          <td>${txn.ref}</td>
          <td>${txn.fee}</td>
          <td class="${remarksClass}">${txn.remarks}</td>
          <td><button onclick="deleteTransaction(${txn.id})">Delete</button></td>
        `;
        tbody.appendChild(row);
      });
    }

    // Display total fee
    totalFeeDiv.textContent = `Total Fee: ${totalFee.toFixed(2)} PHP`;
    tableErrorDiv.style.display = 'none';
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    tbody.innerHTML = '';
    totalFeeDiv.textContent = '';
    tableErrorDiv.style.display = 'block';
    alert('Failed to fetch transactions. Check the console for details.');
  }
}

// Delete transaction
async function deleteTransaction(id) {
  if (!confirm(`Are you sure you want to delete transaction ID ${id}?`)) {
    return;
  }

  try {
    console.log(`Deleting transaction ID: ${id}`);
    const response = await fetch(`http://localhost:5000/api/transactions/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await response.json();
    if (response.ok) {
      alert('Transaction deleted successfully!');
      // Refresh the transaction list
      fetchTransactions();
    } else {
      console.error('Error deleting transaction:', result.error);
      alert(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    alert('Failed to delete transaction');
  }
}

// Download the summary as a PDF
function downloadSummary() {
  const date = document.getElementById('fetchDate').value;
  const sortBy = document.getElementById('sortBy').value;

  if (!date) {
    alert('Please select a date to download the summary.');
    return;
  }

  console.log(`Downloading PDF for date: ${date}, sortBy: ${sortBy}`);
  // Construct the download URL with date and optional sortBy
  let downloadUrl = `http://localhost:5000/api/transactions/download?date=${date}`;
  if (sortBy) {
    downloadUrl += `&sortBy=${sortBy}`;
  }

  // Trigger the download by redirecting to the endpoint
  window.location.href = downloadUrl;
}