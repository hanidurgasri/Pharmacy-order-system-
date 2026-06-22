// API Configuration
const API_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let orderItems = [];

// ===================== AUTH =====================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');

  try {
    const res = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.message;
      errorEl.style.display = 'block';
      return;
    }
    authToken = data.token;
    currentUser = data;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    showApp();
  } catch (err) {
    errorEl.textContent = 'Connection error. Is the server running?';
    errorEl.style.display = 'block';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display = 'none';
});

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'flex';
  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userRole').textContent = currentUser.role;
  loadDashboard();
  loadMedicines();
  loadCustomers();
  loadOrders();
  loadMedicineSelect();
  updateDateTime();
  setInterval(updateDateTime, 1000);
}

function updateDateTime() {
  const now = new Date();
  document.getElementById('currentDateTime').textContent = now.toLocaleString('en-IN');
}

// ===================== NAVIGATION =====================
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    const page = item.dataset.page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
    document.getElementById(`page-${page}`).classList.add('active-page');
    document.getElementById('pageTitle').textContent = item.querySelector('span').textContent;
    if (page === 'dashboard') loadDashboard();
    if (page === 'medicines') loadMedicines();
    if (page === 'orders') loadOrders();
    if (page === 'customers') loadCustomers();
    if (page === 'newOrder') { loadMedicineSelect(); resetOrderForm(); }
  });
});

// ===================== API HELPER =====================
async function apiCall(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${API_URL}${url}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'API Error');
  return data;
}

// ===================== DASHBOARD =====================
async function loadDashboard() {
  try {
    const stats = await apiCall('/orders/stats/summary');
    document.getElementById('totalOrders').textContent = stats.totalOrders;
    document.getElementById('todayOrders').textContent = stats.todayOrders;
    document.getElementById('totalRevenue').textContent = `₹${Number(stats.totalRevenue).toFixed(2)}`;
    document.getElementById('todayRevenue').textContent = `₹${Number(stats.todayRevenue).toFixed(2)}`;

    const tbody = document.querySelector('#recentOrdersTable tbody');
    tbody.innerHTML = stats.recentOrders.map(o => `
      <tr>
        <td>${o.orderNumber}</td>
        <td>${o.customerName}</td>
        <td>₹${o.totalAmount.toFixed(2)}</td>
        <td><span class="badge ${o.status === 'Completed' ? 'badge-success' : 'badge-danger'}">${o.status}</span></td>
        <td>${new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

// ===================== MEDICINES =====================
async function loadMedicines() {
  try {
    const search = document.getElementById('medicineSearch').value;
    const category = document.getElementById('categoryFilter').value;
    const lowStock = document.getElementById('lowStockFilter').checked;
    let url = '/medicines?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (category) url += `category=${encodeURIComponent(category)}&`;
    if (lowStock) url += 'lowStock=true&';

    const medicines = await apiCall(url);
    const tbody = document.querySelector('#medicinesTable tbody');
    tbody.innerHTML = medicines.map(m => {
      const isLowStock = m.stock <= 10;
      const isExpired = m.expiryDate && new Date(m.expiryDate) < new Date();
      return `<tr>
        <td>${m.name} ${m.requiresPrescription ? '<i class="fas fa-prescription" style="color:#f57c00" title="Prescription required"></i>' : ''}</td>
        <td>${m.category}</td>
        <td>${m.manufacturer}</td>
        <td>₹${m.price.toFixed(2)}</td>
        <td><span class="badge ${isLowStock ? 'badge-danger' : 'badge-success'}">${m.stock}</span></td>
        <td>${m.expiryDate ? new Date(m.expiryDate).toLocaleDateString('en-IN') + (isExpired ? ' <span class="badge badge-danger">Expired</span>' : '') : '-'}</td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="editMedicine('${m._id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger" onclick="deleteMedicine('${m._id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error('Medicines error:', err);
  }
}

document.getElementById('medicineSearch').addEventListener('input', loadMedicines);
document.getElementById('categoryFilter').addEventListener('change', loadMedicines);
document.getElementById('lowStockFilter').addEventListener('change', loadMedicines);

document.getElementById('medicineForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('medicineId').value;
  const data = {
    name: document.getElementById('medName').value,
    genericName: document.getElementById('medGenericName').value,
    category: document.getElementById('medCategory').value,
    manufacturer: document.getElementById('medManufacturer').value,
    price: parseFloat(document.getElementById('medPrice').value),
    costPrice: parseFloat(document.getElementById('medCostPrice').value) || undefined,
    stock: parseInt(document.getElementById('medStock').value),
    expiryDate: document.getElementById('medExpiry').value || undefined,
    requiresPrescription: document.getElementById('medPrescription').checked,
    dosage: document.getElementById('medDosage').value,
    description: document.getElementById('medDescription').value,
  };

  try {
    if (id) {
      await apiCall(`/medicines/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      await apiCall('/medicines', { method: 'POST', body: JSON.stringify(data) });
    }
    closeModal('medicineModal');
    loadMedicines();
  } catch (err) {
    alert(err.message);
  }
});

async function editMedicine(id) {
  try {
    const medicine = await apiCall(`/medicines/${id}`);
    document.getElementById('medicineId').value = medicine._id;
    document.getElementById('medName').value = medicine.name;
    document.getElementById('medGenericName').value = medicine.genericName || '';
    document.getElementById('medCategory').value = medicine.category;
    document.getElementById('medManufacturer').value = medicine.manufacturer;
    document.getElementById('medPrice').value = medicine.price;
    document.getElementById('medCostPrice').value = medicine.costPrice || '';
    document.getElementById('medStock').value = medicine.stock;
    document.getElementById('medExpiry').value = medicine.expiryDate ? medicine.expiryDate.split('T')[0] : '';
    document.getElementById('medPrescription').checked = medicine.requiresPrescription;
    document.getElementById('medDosage').value = medicine.dosage || '';
    document.getElementById('medDescription').value = medicine.description || '';
    document.getElementById('medicineModalTitle').textContent = 'Edit Medicine';
    showModal('medicineModal');
  } catch (err) {
    alert(err.message);
  }
}

async function deleteMedicine(id) {
  if (!confirm('Are you sure you want to delete this medicine?')) return;
  try {
    await apiCall(`/medicines/${id}`, { method: 'DELETE' });
    loadMedicines();
  } catch (err) {
    alert(err.message);
  }
}

// ===================== CUSTOMERS =====================
async function loadCustomers() {
  try {
    const search = document.getElementById('customerSearch').value;
    let url = '/customers?';
    if (search) url += `search=${encodeURIComponent(search)}`;

    const customers = await apiCall(url);
    const tbody = document.querySelector('#customersTable tbody');
    tbody.innerHTML = customers.map(c => `<tr>
      <td>${c.name}</td>
      <td>${c.phone}</td>
      <td>${c.email || '-'}</td>
      <td>₹${c.totalPurchases.toFixed(2)}</td>
      <td>${c.lastPurchaseDate ? new Date(c.lastPurchaseDate).toLocaleDateString('en-IN') : '-'}</td>
      <td>
        <button class="btn btn-sm btn-warning" onclick="editCustomer('${c._id}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger" onclick="deleteCustomer('${c._id}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
  } catch (err) {
    console.error('Customers error:', err);
  }
}

document.getElementById('customerSearch').addEventListener('input', loadCustomers);

document.getElementById('customerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('customerId').value;
  const data = {
    name: document.getElementById('custName').value,
    phone: document.getElementById('custPhone').value,
    email: document.getElementById('custEmail').value,
    age: parseInt(document.getElementById('custAge').value) || undefined,
    gender: document.getElementById('custGender').value || undefined,
    address: document.getElementById('custAddress').value,
  };

  try {
    if (id) {
      await apiCall(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      await apiCall('/customers', { method: 'POST', body: JSON.stringify(data) });
    }
    closeModal('customerModal');
    loadCustomers();
  } catch (err) {
    alert(err.message);
  }
});

async function editCustomer(id) {
  try {
    const customer = await apiCall(`/customers/${id}`);
    document.getElementById('customerId').value = customer._id;
    document.getElementById('custName').value = customer.name;
    document.getElementById('custPhone').value = customer.phone;
    document.getElementById('custEmail').value = customer.email || '';
    document.getElementById('custAge').value = customer.age || '';
    document.getElementById('custGender').value = customer.gender || '';
    document.getElementById('custAddress').value = customer.address ? `${customer.address.street || ''}, ${customer.address.city || ''}`.trim() : '';
    document.getElementById('customerModalTitle').textContent = 'Edit Customer';
    showModal('customerModal');
  } catch (err) {
    alert(err.message);
  }
}

async function deleteCustomer(id) {
  if (!confirm('Are you sure you want to delete this customer?')) return;
  try {
    await apiCall(`/customers/${id}`, { method: 'DELETE' });
    loadCustomers();
  } catch (err) {
    alert(err.message);
  }
}

// ===================== ORDERS =====================
async function loadOrders() {
  try {
    const startDate = document.getElementById('orderStartDate').value;
    const endDate = document.getElementById('orderEndDate').value;
    const status = document.getElementById('orderStatusFilter').value;
    let url = '/orders?';
    if (startDate) url += `startDate=${startDate}&`;
    if (endDate) url += `endDate=${endDate}&`;
    if (status) url += `status=${status}`;

    const orders = await apiCall(url);
    const tbody = document.querySelector('#ordersTable tbody');
    tbody.innerHTML = orders.map(o => `<tr>
      <td>${o.orderNumber}</td>
      <td>${o.customerName}</td>
      <td>${o.items.length} item(s)</td>
      <td>₹${o.totalAmount.toFixed(2)}</td>
      <td>${o.paymentMethod}</td>
      <td><span class="badge ${o.status === 'Completed' ? 'badge-success' : o.status === 'Cancelled' ? 'badge-danger' : 'badge-warning'}">${o.status}</span></td>
      <td>${new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
      <td>
        <button class="btn btn-sm btn-info" onclick="viewInvoice('${o._id}')"><i class="fas fa-file-invoice"></i></button>
        ${o.status === 'Completed' ? `<button class="btn btn-sm btn-danger" onclick="cancelOrder('${o._id}')"><i class="fas fa-ban"></i></button>` : ''}
      </td>
    </tr>`).join('');
  } catch (err) {
    console.error('Orders error:', err);
  }
}

function filterOrders() {
  loadOrders();
}

async function cancelOrder(id) {
  if (!confirm('Are you sure you want to cancel this order? Stock will be restored.')) return;
  try {
    await apiCall(`/orders/${id}/cancel`, { method: 'PUT' });
    loadOrders();
    loadDashboard();
  } catch (err) {
    alert(err.message);
  }
}

async function viewInvoice(id) {
  try {
    const order = await apiCall(`/orders/${id}`);
    const invoiceHTML = `
      <div class="invoice">
        <div class="invoice-header">
          <h2><i class="fas fa-prescription-bottle-alt"></i> PharmacyOS</h2>
          <p>Pharmacy Order System</p>
        </div>
        <div class="invoice-info">
          <div>
            <p><strong>Invoice #:</strong> ${order.orderNumber}</p>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString('en-IN')}</p>
            <p><strong>Customer:</strong> ${order.customerName}</p>
            <p><strong>Phone:</strong> ${order.customerPhone || '-'}</p>
          </div>
          <div>
            <p><strong>Payment:</strong> ${order.paymentMethod}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Processed By:</strong> ${order.processedBy?.name || '-'}</p>
          </div>
        </div>
        <table class="invoice-table">
          <thead>
            <tr><th>#</th><th>Medicine</th><th>Price</th><th>Qty</th><th>Total</th></tr>
          </thead>
          <tbody>
            ${order.items.map((item, i) => `<tr>
              <td>${i + 1}</td>
              <td>${item.medicineName}</td>
              <td>₹${item.unitPrice.toFixed(2)}</td>
              <td>${item.quantity}</td>
              <td>₹${item.totalPrice.toFixed(2)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="invoice-total">
          <p>Subtotal: ₹${order.subtotal.toFixed(2)}</p>
          <p>Tax (5%): ₹${order.tax.toFixed(2)}</p>
          ${order.discount > 0 ? `<p>Discount: -₹${order.discount.toFixed(2)}</p>` : ''}
          <p class="grand-total">Total: ₹${order.totalAmount.toFixed(2)}</p>
        </div>
        ${order.notes ? `<p style="margin-top:10px;font-size:13px;"><strong>Notes:</strong> ${order.notes}</p>` : ''}
        <div class="invoice-footer">
          <p>Thank you for your purchase!</p>
          <p>This is a computer-generated invoice.</p>
        </div>
      </div>
    `;
    document.getElementById('invoiceContent').innerHTML = invoiceHTML;
    showModal('invoiceModal');
  } catch (err) {
    alert(err.message);
  }
}

// ===================== NEW ORDER =====================
async function loadMedicineSelect() {
  try {
    const medicines = await apiCall('/medicines');
    const select = document.getElementById('medicineSelect');
    select.innerHTML = '<option value="">-- Select --</option>' +
      medicines.filter(m => m.stock > 0).map(m =>
        `<option value="${m._id}" data-price="${m.price}" data-name="${m.name}">${m.name} - ₹${m.price} (Stock: ${m.stock})</option>`
      ).join('');
  } catch (err) {
    console.error('Load medicines error:', err);
  }
}

function addOrderItem() {
  const select = document.getElementById('medicineSelect');
  const quantity = parseInt(document.getElementById('itemQuantity').value);
  const selectedOption = select.options[select.selectedIndex];

  if (!select.value) { alert('Please select a medicine'); return; }
  if (!quantity || quantity < 1) { alert('Please enter a valid quantity'); return; }

  const medicineId = select.value;
  const medicineName = selectedOption.dataset.name;
  const price = parseFloat(selectedOption.dataset.price);

  const existing = orderItems.find(i => i.medicineId === medicineId);
  if (existing) {
    existing.quantity += quantity;
    existing.totalPrice = existing.quantity * existing.unitPrice;
  } else {
    orderItems.push({ medicineId, medicineName, unitPrice: price, quantity, totalPrice: price * quantity });
  }

  renderOrderItems();
  updateOrderTotal();
  document.getElementById('itemQuantity').value = 1;
  select.value = '';
}

function removeOrderItem(index) {
  orderItems.splice(index, 1);
  renderOrderItems();
  updateOrderTotal();
}

function renderOrderItems() {
  const tbody = document.querySelector('#orderItemsTable tbody');
  tbody.innerHTML = orderItems.map((item, i) => `<tr>
    <td>${item.medicineName}</td>
    <td>₹${item.unitPrice.toFixed(2)}</td>
    <td>${item.quantity}</td>
    <td>₹${item.totalPrice.toFixed(2)}</td>
    <td><button class="btn btn-sm btn-danger" onclick="removeOrderItem(${i})"><i class="fas fa-times"></i></button></td>
  </tr>`).join('');
}

function updateOrderTotal() {
  const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = subtotal * 0.05;
  const discount = parseFloat(document.getElementById('orderDiscount').value) || 0;
  const total = subtotal + tax - discount;

  document.getElementById('orderSubtotal').textContent = `₹${subtotal.toFixed(2)}`;
  document.getElementById('orderTax').textContent = `₹${tax.toFixed(2)}`;
  document.getElementById('orderTotal').textContent = `₹${Math.max(0, total).toFixed(2)}`;
}

function resetOrderForm() {
  orderItems = [];
  document.getElementById('orderCustomerName').value = '';
  document.getElementById('orderCustomerPhone').value = '';
  document.getElementById('orderDiscount').value = 0;
  document.getElementById('orderNotes').value = '';
  document.getElementById('orderPaymentMethod').value = 'Cash';
  renderOrderItems();
  updateOrderTotal();
}

async function placeOrder() {
  const customerName = document.getElementById('orderCustomerName').value.trim();
  const customerPhone = document.getElementById('orderCustomerPhone').value.trim();
  const paymentMethod = document.getElementById('orderPaymentMethod').value;
  const discount = parseFloat(document.getElementById('orderDiscount').value) || 0;
  const notes = document.getElementById('orderNotes').value;

  if (!customerName) { alert('Please enter customer name'); return; }
  if (orderItems.length === 0) { alert('Please add at least one medicine'); return; }

  try {
    const orderData = {
      customerName,
      customerPhone: customerPhone || undefined,
      items: orderItems,
      paymentMethod,
      discount,
      notes,
    };

    const order = await apiCall('/orders', { method: 'POST', body: JSON.stringify(orderData) });
    alert(`Order placed successfully! Order #: ${order.orderNumber}`);
    resetOrderForm();
    loadDashboard();
    loadOrders();
    loadMedicines();
    // Navigate to orders page
    document.querySelector('[data-page="orders"]').click();
  } catch (err) {
    alert(`Error placing order: ${err.message}`);
  }
}

// ===================== MODAL HELPERS =====================
function showModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  // Reset forms
  if (id === 'medicineModal') {
    document.getElementById('medicineForm').reset();
    document.getElementById('medicineId').value = '';
    document.getElementById('medicineModalTitle').textContent = 'Add Medicine';
  }
  if (id === 'customerModal') {
    document.getElementById('customerForm').reset();
    document.getElementById('customerId').value = '';
    document.getElementById('customerModalTitle').textContent = 'Add Customer';
  }
}

// Close modal on outside click
window.addEventListener('click', (e) => {
  document.querySelectorAll('.modal.active').forEach(modal => {
    if (e.target === modal) closeModal(modal.id);
  });
});

// ===================== INIT =====================
if (authToken && currentUser) {
  showApp();
}