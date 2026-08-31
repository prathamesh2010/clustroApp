const http = require('http');

async function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: null, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runIntegrationTests() {
  console.log('--- STARTING CLUSTRO FULL-STACK API INTEGRATION TEST ---');

  // 1. Login as Meera Sharma
  console.log('1. Testing Login API (/auth/login)...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { emailOrUsername: 'meera', password: 'password123' });

  if (loginRes.status !== 200 || !loginRes.data.accessToken) {
    throw new Error(`Login failed with status ${loginRes.status}: ${JSON.stringify(loginRes.data)}`);
  }
  const token = loginRes.data.accessToken;
  console.log('✅ Login successful! Authenticated user:', loginRes.data.user.name);

  // 2. Fetch user clusters
  console.log('\n2. Testing Get Clusters API (/clusters)...');
  const clustersRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/clusters',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (clustersRes.status !== 200 || !Array.isArray(clustersRes.data)) {
    throw new Error(`Get clusters failed: ${JSON.stringify(clustersRes.data)}`);
  }
  console.log(`✅ Retrieved ${clustersRes.data.length} clusters for user:`, clustersRes.data.map(c => c.name));

  const familyCluster = clustersRes.data.find(c => c.name === 'Sharma Ghar');
  if (!familyCluster) throw new Error('Sharma Ghar cluster not found in response');

  // 3. Fetch cluster detail
  console.log(`\n3. Testing Get Cluster Detail (/clusters/${familyCluster.id})...`);
  const detailRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/clusters/${familyCluster.id}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (detailRes.status !== 200) throw new Error(`Cluster detail failed: ${JSON.stringify(detailRes.data)}`);
  console.log('✅ Cluster detail retrieved successfully. Members:', detailRes.data.members.map(m => `${m.displayName} (${m.role})`));

  // 4. Add expense
  console.log('\n4. Testing Add Expense API (/clusters/:id/expenses)...');
  const meeraMember = detailRes.data.members.find(m => m.displayName.includes('Meera'));
  const rameshMember = detailRes.data.members.find(m => m.displayName.includes('Ramesh'));

  const expRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/clusters/${familyCluster.id}/expenses`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }, {
    amount: 500,
    currency: 'INR',
    description: 'Sunday Ice Cream & Sweets',
    category: 'FOOD',
    paidByMemberId: meeraMember.id,
    splitType: 'EQUAL',
    splitMemberIds: [meeraMember.id, rameshMember.id],
  });

  if (expRes.status !== 201) throw new Error(`Add expense failed: ${JSON.stringify(expRes.data)}`);
  console.log('✅ Added expense successfully:', expRes.data.description, `(₹${expRes.data.amount})`, 'with', expRes.data.splits.length, 'splits');

  // 5. Test Settlement Calculation & Rollup Math
  console.log('\n5. Testing Settlement Calculation API (/clusters/:id/settlements/summary)...');
  const settleRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/clusters/${familyCluster.id}/settlements/summary`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (settleRes.status !== 200) throw new Error(`Settlement calculation failed: ${JSON.stringify(settleRes.data)}`);
  console.log('✅ Calculated Settlement Balances:');
  settleRes.data.balances.forEach(b => {
    console.log(`   • ${b.displayName}: Paid ₹${b.paid}, Owed ₹${b.owed}, Net: ₹${b.net} (Rollups: ${b.rollupCount || 0})`);
  });
  console.log('   Suggested Minimal Transactions:', settleRes.data.transactions);

  // 6. Record Payment
  if (settleRes.data.transactions.length > 0) {
    const tx = settleRes.data.transactions[0];
    console.log(`\n6. Testing Record Payment API (${tx.fromName} -> ${tx.toName}: ₹${tx.amount})...`);
    const payRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/clusters/${familyCluster.id}/settlements/payments`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }, {
      fromMemberId: tx.fromMemberId,
      toMemberId: tx.toMemberId,
      amount: tx.amount,
      paymentMethod: 'UPI',
      note: 'Settled via GooglePay UPI',
    });

    if (payRes.status !== 201) throw new Error(`Payment record failed: ${JSON.stringify(payRes.data)}`);
    console.log('✅ Payment recorded successfully! ID:', payRes.data.id);
  }

  // 7. Post and Get Chat Message
  console.log('\n7. Testing Cluster Chat API (/clusters/:id/chat/messages)...');
  const chatPost = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/clusters/${familyCluster.id}/chat/messages`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }, {
    text: 'Hello family! Welcome to Clustro.app 🎉',
  });

  if (chatPost.status !== 201) throw new Error(`Chat post failed: ${JSON.stringify(chatPost.data)}`);
  console.log('✅ Chat message saved:', chatPost.data.messageText);

  // 8. Personal Ledger Dashboard
  console.log('\n8. Testing Personal Ledger Dashboard API (/ledger/dashboard)...');
  const ledgerRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/ledger/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (ledgerRes.status !== 200) throw new Error(`Ledger failed: ${JSON.stringify(ledgerRes.data)}`);
  console.log('✅ Personal Dashboard retrieved successfully:');
  console.log(`   Personal Paid: ₹${ledgerRes.data.personalPaid}, Personal Share: ₹${ledgerRes.data.personalOwed}, Net Position: ₹${ledgerRes.data.personalNet}`);
  console.log(`   Total Across Clusters: ₹${ledgerRes.data.totalAcrossClusters}, Active Clusters: ${ledgerRes.data.activeClusterCount}`);

  // 9. Export CSV
  console.log('\n9. Testing CSV Export API (/clusters/:id/export/csv)...');
  const csvRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/clusters/${familyCluster.id}/export/csv`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (csvRes.status !== 200 || !csvRes.raw.includes('Sharma Ghar')) {
    throw new Error('CSV Export failed');
  }
  console.log('✅ CSV Export generated successfully (length:', csvRes.raw.length, 'bytes)');

  console.log('\n======================================================');
  console.log('✨ ALL FULL-STACK INTEGRATION TESTS PASSED WITH 100% SUCCESS ✨');
  console.log('======================================================');
}

runIntegrationTests().catch(err => {
  console.error('❌ Integration test failed:', err);
  process.exit(1);
});
